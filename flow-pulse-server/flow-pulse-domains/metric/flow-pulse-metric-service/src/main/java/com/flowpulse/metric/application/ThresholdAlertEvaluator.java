package com.flowpulse.metric.application;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.flowpulse.alert.domain.model.AlertEventEntity;
import com.flowpulse.alert.domain.model.AlertStateEntity;
import com.flowpulse.alert.infrastructure.persistence.mapper.AlertEventMapper;
import com.flowpulse.alert.infrastructure.persistence.mapper.AlertStateMapper;
import com.flowpulse.common.IdGenerator;
import com.flowpulse.metric.domain.model.ResourceMetricConfigEntity;
import com.flowpulse.metric.domain.model.ThresholdRuleEntity;
import com.flowpulse.metric.infrastructure.persistence.mapper.ThresholdRuleMapper;
import org.springframework.stereotype.Service;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
public class ThresholdAlertEvaluator {
    private static final Map<String, Integer> LEVEL_RANK = new HashMap<String, Integer>();

    static {
        LEVEL_RANK.put("NORMAL", Integer.valueOf(0));
        LEVEL_RANK.put("REMIND", Integer.valueOf(1));
        LEVEL_RANK.put("WARNING", Integer.valueOf(2));
        LEVEL_RANK.put("ERROR", Integer.valueOf(3));
        LEVEL_RANK.put("CRITICAL", Integer.valueOf(4));
        LEVEL_RANK.put("URGENT", Integer.valueOf(5));
    }

    private final ThresholdRuleMapper thresholdRuleMapper;
    private final AlertStateMapper alertStateMapper;
    private final AlertEventMapper alertEventMapper;
    private final ObjectMapper objectMapper;

    public ThresholdAlertEvaluator(ThresholdRuleMapper thresholdRuleMapper,
                                   AlertStateMapper alertStateMapper,
                                   AlertEventMapper alertEventMapper,
                                   ObjectMapper objectMapper) {
        this.thresholdRuleMapper = thresholdRuleMapper;
        this.alertStateMapper = alertStateMapper;
        this.alertEventMapper = alertEventMapper;
        this.objectMapper = objectMapper;
    }

    public void evaluate(ResourceMetricConfigEntity config, double value, long evaluatedAt) {
        List<ThresholdRuleEntity> rules = thresholdRuleMapper.selectEnabledRulesForMetricObject(
                config.getTenantId(), config.getMetricDefinitionId(), config.getObjectType(), config.getObjectId());
        for (ThresholdRuleEntity rule : rules) {
            EvaluationResult result = evaluateRule(rule, value);
            if (result.triggered) {
                trigger(rule, config, result, value, evaluatedAt);
            } else {
                recover(rule, config, value, evaluatedAt);
            }
        }
    }

    private EvaluationResult evaluateRule(ThresholdRuleEntity rule, double value) {
        EvaluationResult result = new EvaluationResult();
        result.level = "NORMAL";
        try {
            JsonNode conditions = objectMapper.readTree(rule.getConditionsJson());
            if (!conditions.isArray()) {
                return result;
            }
            for (JsonNode condition : conditions) {
                if (condition.has("enabled") && !condition.get("enabled").asBoolean(true)) {
                    continue;
                }
                String severity = upper(text(condition, "severity", "WARNING"));
                String operator = text(condition, "operator", ">=");
                JsonNode thresholdNode = condition.get("value");
                if (thresholdNode == null || !thresholdNode.isNumber()) {
                    continue;
                }
                double threshold = thresholdNode.asDouble();
                if (matches(value, operator, threshold) && rank(severity) > rank(result.level)) {
                    result.triggered = true;
                    result.level = severity;
                    result.operator = operator;
                    result.threshold = threshold;
                }
            }
        } catch (Exception ignored) {
            return result;
        }
        return result;
    }

    private void trigger(ThresholdRuleEntity rule,
                         ResourceMetricConfigEntity config,
                         EvaluationResult result,
                         double value,
                         long evaluatedAt) {
        String baseAlertKey = alertKey(rule, config);
        AlertStateEntity state = alertStateMapper.selectActiveByBaseAlertKey(config.getTenantId(), baseAlertKey);
        String previousLevel = state == null ? "NORMAL" : state.getCurrentLevel();
        boolean newIncident = state == null;
        boolean changed = state == null || !result.level.equals(previousLevel) || !"ACTIVE".equals(state.getStatus());
        if (state == null) {
            state = new AlertStateEntity();
            state.setId(IdGenerator.nextId());
            state.setTenantId(config.getTenantId());
            state.setAlertKey(incidentAlertKey(baseAlertKey, evaluatedAt));
            state.setFirstTriggeredAt(Long.valueOf(evaluatedAt));
            state.setCreatedAt(Long.valueOf(evaluatedAt));
            state.setAcknowledged(Boolean.FALSE);
        }
        fillState(state, rule, config);
        state.setPreviousLevel(previousLevel);
        state.setCurrentLevel(result.level);
        state.setStatus("ACTIVE");
        state.setLastEvaluatedAt(Long.valueOf(evaluatedAt));
        state.setLastChangedAt(Long.valueOf(changed ? evaluatedAt : safeLong(state.getLastChangedAt(), evaluatedAt)));
        state.setRecoveredAt(null);
        state.setTriggerValue(Double.valueOf(value));
        state.setMessage(message(rule, result, value));
        state.setReasonJson(reasonJson(result, value));
        state.setUpdatedAt(Long.valueOf(evaluatedAt));
        if (state.getAcknowledged() == null) {
            state.setAcknowledged(Boolean.FALSE);
        }
        if (newIncident) {
            alertStateMapper.insert(state);
        } else {
            alertStateMapper.update(state);
        }
        if (changed) {
            insertEvent(state, previousLevel, result.level, "TRIGGER", value, state.getMessage(), state.getReasonJson(), evaluatedAt);
        }
    }

    private void recover(ThresholdRuleEntity rule, ResourceMetricConfigEntity config, double value, long evaluatedAt) {
        String baseAlertKey = alertKey(rule, config);
        AlertStateEntity state = alertStateMapper.selectActiveByBaseAlertKey(config.getTenantId(), baseAlertKey);
        if (state == null) {
            return;
        }
        String previousLevel = state.getCurrentLevel();
        boolean changed = !"NORMAL".equals(previousLevel) || !"RECOVERED".equals(state.getStatus());
        fillState(state, rule, config);
        state.setPreviousLevel(previousLevel);
        state.setCurrentLevel("NORMAL");
        state.setStatus("RECOVERED");
        state.setLastEvaluatedAt(Long.valueOf(evaluatedAt));
        state.setLastChangedAt(Long.valueOf(changed ? evaluatedAt : safeLong(state.getLastChangedAt(), evaluatedAt)));
        state.setRecoveredAt(Long.valueOf(evaluatedAt));
        state.setTriggerValue(Double.valueOf(value));
        state.setMessage(rule.getRuleName() + " recovered.");
        state.setReasonJson("{\"value\":" + value + "}");
        state.setUpdatedAt(Long.valueOf(evaluatedAt));
        alertStateMapper.update(state);
        if (changed) {
            insertEvent(state, previousLevel, "NORMAL", "RECOVER", value, state.getMessage(), state.getReasonJson(), evaluatedAt);
        }
    }

    private void fillState(AlertStateEntity state, ThresholdRuleEntity rule, ResourceMetricConfigEntity config) {
        state.setRuleId(rule.getId());
        state.setMetricDefinitionId(rule.getMetricDefinitionId());
        state.setObjectType(config.getObjectType());
        state.setObjectId(config.getObjectId());
        state.setObjectCode(config.getObjectCode());
        state.setObjectName(config.getObjectName());
        state.setTopologyId(defaultText(rule.getTopologyId(), ""));
        state.setTopologyElementId(defaultText(rule.getTopologyElementId(), ""));
        state.setTopologyElementType(defaultText(rule.getTopologyElementType(), ""));
    }

    private void insertEvent(AlertStateEntity state,
                             String fromLevel,
                             String toLevel,
                             String eventType,
                             double value,
                             String message,
                             String reasonJson,
                             long eventAt) {
        AlertEventEntity event = new AlertEventEntity();
        event.setId(IdGenerator.nextId());
        event.setTenantId(state.getTenantId());
        event.setAlertStateId(state.getId());
        event.setAlertKey(state.getAlertKey());
        event.setFromLevel(fromLevel == null ? "NORMAL" : fromLevel);
        event.setToLevel(toLevel);
        event.setEventType(eventType);
        event.setEventAt(Long.valueOf(eventAt));
        event.setTriggerValue(Double.valueOf(value));
        event.setMessage(message);
        event.setReasonJson(reasonJson);
        event.setCreatedAt(Long.valueOf(eventAt));
        alertEventMapper.insert(event);
    }

    private String alertKey(ThresholdRuleEntity rule, ResourceMetricConfigEntity config) {
        if ("TOPOLOGY_ELEMENT".equals(upper(rule.getScopeType()))) {
            return rule.getId() + ":TOPOLOGY:" + defaultText(rule.getTopologyElementId(), config.getObjectId());
        }
        return rule.getId() + ":" + config.getObjectType() + ":" + config.getObjectId();
    }

    private String incidentAlertKey(String baseAlertKey, long triggeredAt) {
        return baseAlertKey + ":" + triggeredAt;
    }

    private String message(ThresholdRuleEntity rule, EvaluationResult result, double value) {
        return rule.getRuleName() + " triggered " + result.level + ": value " + value + " "
                + result.operator + " " + result.threshold;
    }

    private String reasonJson(EvaluationResult result, double value) {
        return "{\"value\":" + value + ",\"operator\":\"" + result.operator
                + "\",\"threshold\":" + result.threshold + ",\"level\":\"" + result.level + "\"}";
    }

    private boolean matches(double value, String operator, double threshold) {
        if (">".equals(operator)) {
            return value > threshold;
        }
        if (">=".equals(operator)) {
            return value >= threshold;
        }
        if ("<".equals(operator)) {
            return value < threshold;
        }
        if ("<=".equals(operator)) {
            return value <= threshold;
        }
        if ("==".equals(operator) || "=".equals(operator)) {
            return Double.compare(value, threshold) == 0;
        }
        if ("!=".equals(operator)) {
            return Double.compare(value, threshold) != 0;
        }
        return false;
    }

    private int rank(String level) {
        Integer rank = LEVEL_RANK.get(upper(level));
        return rank == null ? 0 : rank.intValue();
    }

    private String text(JsonNode node, String field, String defaultValue) {
        JsonNode value = node.get(field);
        return value == null || value.isNull() ? defaultValue : value.asText();
    }

    private String upper(String value) {
        return value == null ? "" : value.trim().toUpperCase();
    }

    private String defaultText(String value, String defaultValue) {
        String text = value == null ? "" : value.trim();
        return text.length() == 0 ? defaultValue : text;
    }

    private long safeLong(Long value, long defaultValue) {
        return value == null ? defaultValue : value.longValue();
    }

    private static class EvaluationResult {
        private boolean triggered;
        private String level;
        private String operator;
        private double threshold;
    }
}
