package com.flowpulse.metric.application;

import com.flowpulse.common.BusinessException;
import com.flowpulse.common.ErrorCode;
import com.flowpulse.common.IdGenerator;
import com.flowpulse.common.StatCard;
import com.flowpulse.metric.api.request.ThresholdRuleQueryRequest;
import com.flowpulse.metric.api.request.ThresholdRuleSaveRequest;
import com.flowpulse.metric.api.response.PageResponse;
import com.flowpulse.metric.api.response.ThresholdRulePageResponse;
import com.flowpulse.metric.api.response.ThresholdRuleResponse;
import com.flowpulse.metric.domain.model.MetricDefinitionEntity;
import com.flowpulse.metric.domain.model.ThresholdRuleEntity;
import com.flowpulse.metric.infrastructure.persistence.mapper.MetricDefinitionMapper;
import com.flowpulse.metric.infrastructure.persistence.mapper.ThresholdRuleMapper;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;

@Service
public class ThresholdRuleService {
    private static final Set<String> SCOPES = new HashSet<String>(Arrays.asList("GLOBAL", "RESOURCE", "TOPOLOGY_ELEMENT"));
    private static final Set<String> RECOVERY_POLICIES = new HashSet<String>(Arrays.asList("AUTO", "MANUAL"));

    private final ThresholdRuleMapper thresholdRuleMapper;
    private final MetricDefinitionMapper metricDefinitionMapper;

    public ThresholdRuleService(ThresholdRuleMapper thresholdRuleMapper, MetricDefinitionMapper metricDefinitionMapper) {
        this.thresholdRuleMapper = thresholdRuleMapper;
        this.metricDefinitionMapper = metricDefinitionMapper;
    }

    public ThresholdRulePageResponse page(String tenantId, ThresholdRuleQueryRequest request) {
        ThresholdRuleQueryRequest query = request == null ? new ThresholdRuleQueryRequest() : request;
        int pageNo = positive(query.getPageNo(), 1);
        int pageSize = bounded(query.getPageSize(), 10, 100);
        Boolean enabled = parseEnabled(query.getEnabled());
        List<ThresholdRuleEntity> rows = thresholdRuleMapper.selectPage(
                tenantId, trim(query.getKeyword()), trim(query.getMetricDefinitionId()), upper(query.getScopeType()),
                upper(query.getObjectType()), trim(query.getObjectId()), enabled, (pageNo - 1) * pageSize, pageSize);
        long total = thresholdRuleMapper.countPage(
                tenantId, trim(query.getKeyword()), trim(query.getMetricDefinitionId()), upper(query.getScopeType()),
                upper(query.getObjectType()), trim(query.getObjectId()), enabled);

        PageResponse<ThresholdRuleResponse> page = new PageResponse<ThresholdRuleResponse>();
        page.setRecords(toResponses(rows));
        page.setTotal(total);
        page.setPageNo(pageNo);
        page.setPageSize(pageSize);

        ThresholdRulePageResponse response = new ThresholdRulePageResponse();
        response.setRules(page);
        response.setStats(buildStats(tenantId));
        return response;
    }

    public ThresholdRuleResponse detail(String tenantId, String id) {
        return toResponse(require(tenantId, id));
    }

    @Transactional
    public ThresholdRuleResponse create(String tenantId, ThresholdRuleSaveRequest request) {
        assertUnique(tenantId, null, request.getRuleCode());
        long now = System.currentTimeMillis();
        ThresholdRuleEntity entity = new ThresholdRuleEntity();
        entity.setId(IdGenerator.nextId());
        entity.setTenantId(tenantId);
        fill(tenantId, entity, request);
        entity.setCreatedAt(Long.valueOf(now));
        entity.setUpdatedAt(Long.valueOf(now));
        thresholdRuleMapper.insert(entity);
        return detail(tenantId, entity.getId());
    }

    @Transactional
    public ThresholdRuleResponse update(String tenantId, String id, ThresholdRuleSaveRequest request) {
        ThresholdRuleEntity entity = require(tenantId, id);
        assertUnique(tenantId, id, request.getRuleCode());
        fill(tenantId, entity, request);
        entity.setUpdatedAt(Long.valueOf(System.currentTimeMillis()));
        thresholdRuleMapper.update(entity);
        return detail(tenantId, id);
    }

    @Transactional
    public void delete(String tenantId, String id) {
        require(tenantId, id);
        thresholdRuleMapper.deleteById(tenantId, id);
    }

    private void fill(String tenantId, ThresholdRuleEntity entity, ThresholdRuleSaveRequest request) {
        MetricDefinitionEntity metricDefinition = metricDefinitionMapper.selectById(tenantId, request.getMetricDefinitionId());
        if (metricDefinition == null) {
            throw new BusinessException(ErrorCode.RESOURCE_NOT_FOUND, "metric.not.found");
        }
        String scopeType = normalize(request.getScopeType(), SCOPES, "threshold.scope.type.invalid");
        validateScope(scopeType, request);
        entity.setRuleCode(trim(request.getRuleCode()));
        entity.setRuleName(trim(request.getRuleName()));
        entity.setMetricDefinitionId(metricDefinition.getId());
        entity.setScopeType(scopeType);
        entity.setObjectType(upper(request.getObjectType()));
        entity.setObjectId(trim(request.getObjectId()));
        entity.setObjectCode(trim(request.getObjectCode()));
        entity.setObjectName(trim(request.getObjectName()));
        entity.setTopologyId(trim(request.getTopologyId()));
        entity.setTopologyElementId(trim(request.getTopologyElementId()));
        entity.setTopologyElementType(upper(request.getTopologyElementType()));
        entity.setConditionsJson(trim(request.getConditionsJson()));
        entity.setEvaluationWindowSec(min(request.getEvaluationWindowSec(), 10, "threshold.evaluation.window.invalid"));
        entity.setConsecutiveCount(min(request.getConsecutiveCount(), 1, "threshold.consecutive.count.invalid"));
        entity.setRecoveryPolicy(normalize(defaultText(request.getRecoveryPolicy(), "AUTO"), RECOVERY_POLICIES, "threshold.recovery.policy.invalid"));
        entity.setEnabled(request.getEnabled() == null ? Boolean.TRUE : request.getEnabled());
        entity.setDescription(trim(request.getDescription()));
    }

    private void validateScope(String scopeType, ThresholdRuleSaveRequest request) {
        if ("RESOURCE".equals(scopeType) && trim(request.getObjectId()).length() == 0) {
            throw new BusinessException(ErrorCode.VALIDATION_FAILED, "threshold.resource.object.required");
        }
        if ("TOPOLOGY_ELEMENT".equals(scopeType)
                && (trim(request.getTopologyId()).length() == 0 || trim(request.getTopologyElementId()).length() == 0)) {
            throw new BusinessException(ErrorCode.VALIDATION_FAILED, "threshold.topology.element.required");
        }
    }

    private ThresholdRuleEntity require(String tenantId, String id) {
        ThresholdRuleEntity entity = thresholdRuleMapper.selectById(tenantId, id);
        if (entity == null) {
            throw new BusinessException(ErrorCode.RESOURCE_NOT_FOUND, "threshold.rule.not.found");
        }
        return entity;
    }

    private void assertUnique(String tenantId, String currentId, String ruleCode) {
        ThresholdRuleEntity entity = thresholdRuleMapper.selectByCode(tenantId, trim(ruleCode));
        if (entity != null && !entity.getId().equals(currentId)) {
            throw new BusinessException(ErrorCode.CONFLICT, "threshold.rule.code.exists");
        }
    }

    private List<ThresholdRuleResponse> toResponses(List<ThresholdRuleEntity> rows) {
        List<ThresholdRuleResponse> responses = new ArrayList<ThresholdRuleResponse>();
        for (ThresholdRuleEntity row : rows) {
            responses.add(toResponse(row));
        }
        return responses;
    }

    private ThresholdRuleResponse toResponse(ThresholdRuleEntity entity) {
        ThresholdRuleResponse response = new ThresholdRuleResponse();
        response.setId(entity.getId());
        response.setRuleCode(entity.getRuleCode());
        response.setRuleName(entity.getRuleName());
        response.setMetricDefinitionId(entity.getMetricDefinitionId());
        response.setMetricCode(entity.getMetricCode());
        response.setMetricName(entity.getMetricName());
        response.setScopeType(entity.getScopeType());
        response.setObjectType(entity.getObjectType());
        response.setObjectId(entity.getObjectId());
        response.setObjectCode(entity.getObjectCode());
        response.setObjectName(entity.getObjectName());
        response.setTopologyId(entity.getTopologyId());
        response.setTopologyElementId(entity.getTopologyElementId());
        response.setTopologyElementType(entity.getTopologyElementType());
        response.setConditionsJson(entity.getConditionsJson());
        response.setEvaluationWindowSec(entity.getEvaluationWindowSec());
        response.setConsecutiveCount(entity.getConsecutiveCount());
        response.setRecoveryPolicy(entity.getRecoveryPolicy());
        response.setEnabled(entity.getEnabled());
        response.setDescription(entity.getDescription());
        response.setCreatedAt(entity.getCreatedAt());
        response.setUpdatedAt(entity.getUpdatedAt());
        return response;
    }

    private List<StatCard> buildStats(String tenantId) {
        List<StatCard> stats = new ArrayList<StatCard>();
        stats.add(new StatCard("阈值规则", String.valueOf(thresholdRuleMapper.countAll(tenantId)), "已维护的判定规则"));
        stats.add(new StatCard("启用规则", String.valueOf(thresholdRuleMapper.countEnabled(tenantId)), "正在参与告警判定"));
        stats.add(new StatCard("资源规则", String.valueOf(thresholdRuleMapper.countScope(tenantId, "RESOURCE")), "绑定到具体资源对象"));
        stats.add(new StatCard("拓扑规则", String.valueOf(thresholdRuleMapper.countScope(tenantId, "TOPOLOGY_ELEMENT")), "绑定到拓扑节点或连线"));
        return stats;
    }

    private int min(Integer value, int min, String messageKey) {
        if (value == null || value.intValue() < min) {
            throw new BusinessException(ErrorCode.VALIDATION_FAILED, messageKey);
        }
        return value.intValue();
    }

    private String normalize(String value, Set<String> allowedValues, String messageKey) {
        String text = upper(value);
        if (!allowedValues.contains(text)) {
            throw new BusinessException(ErrorCode.VALIDATION_FAILED, messageKey);
        }
        return text;
    }

    private Boolean parseEnabled(String value) {
        String text = trim(value);
        if (text.length() == 0) {
            return null;
        }
        return Boolean.valueOf("true".equalsIgnoreCase(text) || "ENABLED".equalsIgnoreCase(text));
    }

    private int positive(Integer value, int defaultValue) {
        return value == null || value.intValue() <= 0 ? defaultValue : value.intValue();
    }

    private int bounded(Integer value, int defaultValue, int max) {
        return Math.min(positive(value, defaultValue), max);
    }

    private String defaultText(String value, String defaultValue) {
        String text = trim(value);
        return text.length() == 0 ? defaultValue : text;
    }

    private String upper(String value) {
        return trim(value).toUpperCase(Locale.ROOT);
    }

    private String trim(String value) {
        return value == null ? "" : value.trim();
    }
}
