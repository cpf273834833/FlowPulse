package com.flowpulse.metric.application;

import com.flowpulse.common.BusinessException;
import com.flowpulse.common.ErrorCode;
import com.flowpulse.common.IdGenerator;
import com.flowpulse.common.StatCard;
import com.flowpulse.metric.api.request.MetricApplicabilityRequest;
import com.flowpulse.metric.api.request.MetricApplicabilitySaveRequest;
import com.flowpulse.metric.api.request.MetricDefinitionQueryRequest;
import com.flowpulse.metric.api.request.MetricDefinitionSaveRequest;
import com.flowpulse.metric.api.response.MetricApplicabilityResponse;
import com.flowpulse.metric.api.response.MetricDefinitionPageResponse;
import com.flowpulse.metric.api.response.MetricDefinitionResponse;
import com.flowpulse.metric.api.response.PageResponse;
import com.flowpulse.metric.domain.model.MetricApplicabilityEntity;
import com.flowpulse.metric.domain.model.MetricDefinitionEntity;
import com.flowpulse.metric.infrastructure.persistence.mapper.MetricApplicabilityMapper;
import com.flowpulse.metric.infrastructure.persistence.mapper.MetricDefinitionMapper;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;

@Service
public class MetricDefinitionService {
    private static final Set<String> CATEGORIES = new HashSet<String>(Arrays.asList(
            "INFRASTRUCTURE", "APPLICATION", "EXECUTOR_NODE", "TOPOLOGY_NODE", "TOPOLOGY_EDGE", "DERIVED"));
    private static final Set<String> DERIVE_TYPES = new HashSet<String>(Arrays.asList(
            "DELTA", "DELTA_PER_SECOND"));

    private final MetricDefinitionMapper metricDefinitionMapper;
    private final MetricApplicabilityMapper metricApplicabilityMapper;

    public MetricDefinitionService(MetricDefinitionMapper metricDefinitionMapper,
                                   MetricApplicabilityMapper metricApplicabilityMapper) {
        this.metricDefinitionMapper = metricDefinitionMapper;
        this.metricApplicabilityMapper = metricApplicabilityMapper;
    }

    public MetricDefinitionPageResponse page(String tenantId, MetricDefinitionQueryRequest request) {
        MetricDefinitionQueryRequest query = request == null ? new MetricDefinitionQueryRequest() : request;
        int pageNo = positive(query.getPageNo(), 1);
        int pageSize = bounded(query.getPageSize(), 10, 100);
        int offset = (pageNo - 1) * pageSize;
        Boolean enabled = parseEnabled(query.getEnabled());
        List<MetricDefinitionEntity> entities = metricDefinitionMapper.selectPage(
                tenantId, trim(query.getKeyword()), upper(query.getMetricCategory()),
                upper(query.getObjectType()), enabled, offset, pageSize);
        long total = metricDefinitionMapper.countPage(
                tenantId, trim(query.getKeyword()), upper(query.getMetricCategory()),
                upper(query.getObjectType()), enabled);

        PageResponse<MetricDefinitionResponse> metrics = new PageResponse<MetricDefinitionResponse>();
        metrics.setRecords(toResponses(tenantId, entities, true));
        metrics.setTotal(total);
        metrics.setPageNo(pageNo);
        metrics.setPageSize(pageSize);

        MetricDefinitionPageResponse response = new MetricDefinitionPageResponse();
        response.setMetrics(metrics);
        response.setStats(buildStats(tenantId));
        return response;
    }

    public MetricDefinitionResponse detail(String tenantId, String id) {
        return toResponse(require(tenantId, id), metricApplicabilityMapper.selectByMetricIds(tenantId, Arrays.asList(id)));
    }

    public List<MetricDefinitionResponse> applicable(String tenantId, MetricApplicabilityRequest request) {
        MetricApplicabilityRequest query = request == null ? new MetricApplicabilityRequest() : request;
        String scopeType = upper(query.getScopeType());
        if (scopeType.length() == 0) {
            throw new BusinessException(ErrorCode.VALIDATION_FAILED, "metric.applicability.scope.required");
        }
        Boolean enabled = parseEnabled(query.getEnabled());
        if (query.getEnabled() == null || trim(query.getEnabled()).length() == 0) {
            enabled = Boolean.TRUE;
        }
        List<MetricDefinitionEntity> entities = metricApplicabilityMapper.selectApplicableMetrics(
                tenantId, scopeType, upper(query.getObjectType()), upper(query.getRelationType()),
                upper(query.getSourceObjectType()), upper(query.getTargetObjectType()), enabled);
        return toResponses(tenantId, entities, true);
    }

    @Transactional
    public MetricDefinitionResponse create(String tenantId, MetricDefinitionSaveRequest request) {
        assertCodeUnique(tenantId, null, request.getMetricCode());
        long now = System.currentTimeMillis();
        MetricDefinitionEntity entity = new MetricDefinitionEntity();
        entity.setId(IdGenerator.nextId());
        entity.setTenantId(tenantId);
        fill(entity, request);
        entity.setCreatedAt(Long.valueOf(now));
        entity.setUpdatedAt(Long.valueOf(now));
        metricDefinitionMapper.insert(entity);
        saveApplicabilityRules(tenantId, entity, request.getApplicabilityRules(), now);
        return detail(tenantId, entity.getId());
    }

    @Transactional
    public MetricDefinitionResponse update(String tenantId, String id, MetricDefinitionSaveRequest request) {
        MetricDefinitionEntity entity = require(tenantId, id);
        assertEditable(entity);
        assertCodeUnique(tenantId, id, request.getMetricCode());
        fill(entity, request);
        entity.setUpdatedAt(Long.valueOf(System.currentTimeMillis()));
        metricDefinitionMapper.update(entity);
        saveApplicabilityRules(tenantId, entity, request.getApplicabilityRules(), entity.getUpdatedAt().longValue());
        return detail(tenantId, id);
    }

    @Transactional
    public void delete(String tenantId, String id) {
        MetricDefinitionEntity entity = require(tenantId, id);
        assertEditable(entity);
        metricApplicabilityMapper.deleteByMetricDefinitionId(tenantId, id);
        metricDefinitionMapper.deleteById(tenantId, id);
    }

    private void fill(MetricDefinitionEntity entity, MetricDefinitionSaveRequest request) {
        entity.setMetricCode(trim(request.getMetricCode()));
        entity.setMetricName(trim(request.getMetricName()));
        entity.setMetricCategory(normalize(request.getMetricCategory(), CATEGORIES, "metric.category.invalid"));
        entity.setObjectType(upper(request.getObjectType()));
        entity.setValueUnit(trim(request.getValueUnit()));
        entity.setValuePrecision(request.getValuePrecision() == null ? Integer.valueOf(2) : request.getValuePrecision());
        entity.setMetricKind(normalizeMetricKind(request.getMetricKind()));
        entity.setInstanceDimension(trim(request.getInstanceDimension()));
        entity.setSourceMetricCode(trim(request.getSourceMetricCode()));
        entity.setDeriveType(normalizeDeriveType(request.getDeriveType(), entity.getMetricKind()));
        entity.setParameterSchemaJson(trim(request.getParameterSchemaJson()));
        entity.setMappingJson(trim(request.getMappingJson()));
        if (entity.getSystemBuiltin() == null) {
            entity.setSystemBuiltin(Boolean.FALSE);
        }
        entity.setEnabled(request.getEnabled() == null ? Boolean.TRUE : request.getEnabled());
        entity.setDescription(trim(request.getDescription()));
    }

    private MetricDefinitionEntity require(String tenantId, String id) {
        MetricDefinitionEntity entity = metricDefinitionMapper.selectById(tenantId, id);
        if (entity == null) {
            throw new BusinessException(ErrorCode.RESOURCE_NOT_FOUND, "metric.not.found");
        }
        return entity;
    }

    private void assertCodeUnique(String tenantId, String currentId, String metricCode) {
        MetricDefinitionEntity entity = metricDefinitionMapper.selectByCode(tenantId, trim(metricCode));
        if (entity != null && !entity.getId().equals(currentId)) {
            throw new BusinessException(ErrorCode.CONFLICT, "metric.code.exists");
        }
    }

    private void assertEditable(MetricDefinitionEntity entity) {
        if (Boolean.TRUE.equals(entity.getSystemBuiltin())) {
            throw new BusinessException(ErrorCode.CONFLICT, "metric.system.builtin.readonly");
        }
    }

    private void saveApplicabilityRules(String tenantId, MetricDefinitionEntity entity,
                                        List<MetricApplicabilitySaveRequest> rules, long now) {
        metricApplicabilityMapper.deleteByMetricDefinitionId(tenantId, entity.getId());
        List<MetricApplicabilitySaveRequest> effectiveRules = rules == null || rules.isEmpty()
                ? defaultApplicabilityRules(entity) : rules;
        for (MetricApplicabilitySaveRequest rule : effectiveRules) {
            MetricApplicabilityEntity applicability = new MetricApplicabilityEntity();
            applicability.setId(IdGenerator.nextId());
            applicability.setTenantId(tenantId);
            applicability.setMetricDefinitionId(entity.getId());
            applicability.setScopeType(upper(rule.getScopeType()));
            applicability.setObjectType(upper(rule.getObjectType()));
            applicability.setRelationType(upper(rule.getRelationType()));
            applicability.setSourceObjectType(upper(rule.getSourceObjectType()));
            applicability.setTargetObjectType(upper(rule.getTargetObjectType()));
            applicability.setCollectAnchor(normalizeCollectAnchor(rule.getCollectAnchor(), applicability.getScopeType()));
            applicability.setRequiredParamsJson(trim(rule.getRequiredParamsJson()));
            applicability.setEnabled(rule.getEnabled() == null ? Boolean.TRUE : rule.getEnabled());
            applicability.setDescription(trim(rule.getDescription()));
            applicability.setCreatedAt(Long.valueOf(now));
            applicability.setUpdatedAt(Long.valueOf(now));
            metricApplicabilityMapper.insert(applicability);
        }
    }

    private List<MetricApplicabilitySaveRequest> defaultApplicabilityRules(MetricDefinitionEntity entity) {
        MetricApplicabilitySaveRequest rule = new MetricApplicabilitySaveRequest();
        rule.setEnabled(Boolean.TRUE);
        if ("TOPOLOGY_EDGE".equals(entity.getMetricCategory())) {
            rule.setScopeType("TOPOLOGY_EDGE");
            rule.setObjectType("TOPOLOGY_EDGE");
            rule.setCollectAnchor("SOURCE_OBJECT");
        } else if ("TOPOLOGY_NODE".equals(entity.getMetricCategory())) {
            rule.setScopeType("TOPOLOGY_NODE");
            rule.setObjectType(entity.getObjectType());
            rule.setCollectAnchor("CURRENT_OBJECT");
        } else {
            rule.setScopeType(entity.getMetricCategory());
            rule.setObjectType(entity.getObjectType());
            rule.setCollectAnchor("CURRENT_OBJECT");
        }
        return Arrays.asList(rule);
    }

    private List<MetricDefinitionResponse> toResponses(String tenantId, List<MetricDefinitionEntity> entities, boolean withRules) {
        List<MetricDefinitionResponse> responses = new ArrayList<MetricDefinitionResponse>();
        List<MetricApplicabilityEntity> rules = withRules ? metricApplicabilityMapper.selectByMetricIds(tenantId, ids(entities)) : new ArrayList<MetricApplicabilityEntity>();
        for (MetricDefinitionEntity entity : entities) {
            responses.add(toResponse(entity, rulesForMetric(rules, entity.getId())));
        }
        return responses;
    }

    private MetricDefinitionResponse toResponse(MetricDefinitionEntity entity, List<MetricApplicabilityEntity> rules) {
        MetricDefinitionResponse response = new MetricDefinitionResponse();
        response.setId(entity.getId());
        response.setMetricCode(entity.getMetricCode());
        response.setMetricName(entity.getMetricName());
        response.setMetricCategory(entity.getMetricCategory());
        response.setObjectType(entity.getObjectType());
        response.setValueUnit(entity.getValueUnit());
        response.setValuePrecision(entity.getValuePrecision());
        response.setMetricKind(entity.getMetricKind());
        response.setInstanceDimension(entity.getInstanceDimension());
        response.setSourceMetricCode(entity.getSourceMetricCode());
        response.setDeriveType(entity.getDeriveType());
        response.setParameterSchemaJson(entity.getParameterSchemaJson());
        response.setMappingJson(entity.getMappingJson());
        response.setSystemBuiltin(entity.getSystemBuiltin());
        response.setEnabled(entity.getEnabled());
        response.setImplementationCount(entity.getImplementationCount() == null ? Long.valueOf(0L) : entity.getImplementationCount());
        response.setDescription(entity.getDescription());
        response.setCreatedAt(entity.getCreatedAt());
        response.setUpdatedAt(entity.getUpdatedAt());
        response.setApplicabilityRules(toApplicabilityResponses(rules));
        return response;
    }

    private List<String> ids(List<MetricDefinitionEntity> entities) {
        List<String> ids = new ArrayList<String>();
        for (MetricDefinitionEntity entity : entities) {
            ids.add(entity.getId());
        }
        return ids;
    }

    private List<MetricApplicabilityEntity> rulesForMetric(List<MetricApplicabilityEntity> rules, String metricId) {
        List<MetricApplicabilityEntity> result = new ArrayList<MetricApplicabilityEntity>();
        for (MetricApplicabilityEntity rule : rules) {
            if (metricId.equals(rule.getMetricDefinitionId())) {
                result.add(rule);
            }
        }
        return result;
    }

    private List<MetricApplicabilityResponse> toApplicabilityResponses(List<MetricApplicabilityEntity> rules) {
        List<MetricApplicabilityResponse> responses = new ArrayList<MetricApplicabilityResponse>();
        for (MetricApplicabilityEntity rule : rules) {
            MetricApplicabilityResponse response = new MetricApplicabilityResponse();
            response.setId(rule.getId());
            response.setMetricDefinitionId(rule.getMetricDefinitionId());
            response.setScopeType(rule.getScopeType());
            response.setObjectType(rule.getObjectType());
            response.setRelationType(rule.getRelationType());
            response.setSourceObjectType(rule.getSourceObjectType());
            response.setTargetObjectType(rule.getTargetObjectType());
            response.setCollectAnchor(rule.getCollectAnchor());
            response.setRequiredParamsJson(rule.getRequiredParamsJson());
            response.setEnabled(rule.getEnabled());
            response.setDescription(rule.getDescription());
            response.setCreatedAt(rule.getCreatedAt());
            response.setUpdatedAt(rule.getUpdatedAt());
            responses.add(response);
        }
        return responses;
    }

    private List<StatCard> buildStats(String tenantId) {
        List<StatCard> stats = new ArrayList<StatCard>();
        stats.add(new StatCard("指标定义", String.valueOf(metricDefinitionMapper.countAll(tenantId)), "已维护的指标口径"));
        stats.add(new StatCard("启用指标", String.valueOf(metricDefinitionMapper.countEnabled(tenantId)), "可用于资源指标配置"));
        stats.add(new StatCard("适用对象", String.valueOf(metricDefinitionMapper.countObjectTypes(tenantId)), "已覆盖的对象类型"));
        stats.add(new StatCard("状态映射", String.valueOf(metricDefinitionMapper.countMapped(tenantId)), "配置了展示映射的指标"));
        return stats;
    }

    private String normalize(String value, Set<String> allowedValues, String messageKey) {
        String text = upper(value);
        if (!allowedValues.contains(text)) {
            throw new BusinessException(ErrorCode.VALIDATION_FAILED, messageKey);
        }
        return text;
    }

    private String normalizeMetricKind(String value) {
        String text = upper(value);
        return "DERIVED".equals(text) ? "DERIVED" : "RAW";
    }

    private String normalizeDeriveType(String value, String metricKind) {
        if (!"DERIVED".equals(metricKind)) {
            return "";
        }
        String text = upper(value);
        if (!DERIVE_TYPES.contains(text)) {
            throw new BusinessException(ErrorCode.VALIDATION_FAILED, "metric.derive.type.invalid");
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

    private String normalizeCollectAnchor(String value, String scopeType) {
        String text = upper(value);
        if (text.length() > 0) {
            return text;
        }
        if ("TOPOLOGY_EDGE".equals(scopeType)) {
            return "SOURCE_OBJECT";
        }
        return "CURRENT_OBJECT";
    }

    private int positive(Integer value, int defaultValue) {
        return value == null || value.intValue() <= 0 ? defaultValue : value.intValue();
    }

    private int bounded(Integer value, int defaultValue, int max) {
        return Math.min(positive(value, defaultValue), max);
    }

    private String upper(String value) {
        return trim(value).toUpperCase(Locale.ROOT);
    }

    private String trim(String value) {
        return value == null ? "" : value.trim();
    }
}
