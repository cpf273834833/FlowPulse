package com.flowpulse.metric.application;

import com.flowpulse.common.BusinessException;
import com.flowpulse.common.ErrorCode;
import com.flowpulse.common.IdGenerator;
import com.flowpulse.common.StatCard;
import com.flowpulse.metric.api.request.MetricDefinitionQueryRequest;
import com.flowpulse.metric.api.request.MetricDefinitionSaveRequest;
import com.flowpulse.metric.api.response.MetricDefinitionPageResponse;
import com.flowpulse.metric.api.response.MetricDefinitionResponse;
import com.flowpulse.metric.api.response.PageResponse;
import com.flowpulse.metric.domain.model.MetricDefinitionEntity;
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

    private final MetricDefinitionMapper metricDefinitionMapper;

    public MetricDefinitionService(MetricDefinitionMapper metricDefinitionMapper) {
        this.metricDefinitionMapper = metricDefinitionMapper;
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
        metrics.setRecords(toResponses(entities));
        metrics.setTotal(total);
        metrics.setPageNo(pageNo);
        metrics.setPageSize(pageSize);

        MetricDefinitionPageResponse response = new MetricDefinitionPageResponse();
        response.setMetrics(metrics);
        response.setStats(buildStats(tenantId));
        return response;
    }

    public MetricDefinitionResponse detail(String tenantId, String id) {
        return toResponse(require(tenantId, id));
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
        return toResponse(entity);
    }

    @Transactional
    public MetricDefinitionResponse update(String tenantId, String id, MetricDefinitionSaveRequest request) {
        MetricDefinitionEntity entity = require(tenantId, id);
        assertCodeUnique(tenantId, id, request.getMetricCode());
        fill(entity, request);
        entity.setUpdatedAt(Long.valueOf(System.currentTimeMillis()));
        metricDefinitionMapper.update(entity);
        return detail(tenantId, id);
    }

    @Transactional
    public void delete(String tenantId, String id) {
        require(tenantId, id);
        metricDefinitionMapper.deleteById(tenantId, id);
    }

    private void fill(MetricDefinitionEntity entity, MetricDefinitionSaveRequest request) {
        entity.setMetricCode(trim(request.getMetricCode()));
        entity.setMetricName(trim(request.getMetricName()));
        entity.setMetricCategory(normalize(request.getMetricCategory(), CATEGORIES, "metric.category.invalid"));
        entity.setObjectType(upper(request.getObjectType()));
        entity.setValueUnit(trim(request.getValueUnit()));
        entity.setValuePrecision(request.getValuePrecision() == null ? Integer.valueOf(2) : request.getValuePrecision());
        entity.setMappingJson(trim(request.getMappingJson()));
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

    private List<MetricDefinitionResponse> toResponses(List<MetricDefinitionEntity> entities) {
        List<MetricDefinitionResponse> responses = new ArrayList<MetricDefinitionResponse>();
        for (MetricDefinitionEntity entity : entities) {
            responses.add(toResponse(entity));
        }
        return responses;
    }

    private MetricDefinitionResponse toResponse(MetricDefinitionEntity entity) {
        MetricDefinitionResponse response = new MetricDefinitionResponse();
        response.setId(entity.getId());
        response.setMetricCode(entity.getMetricCode());
        response.setMetricName(entity.getMetricName());
        response.setMetricCategory(entity.getMetricCategory());
        response.setObjectType(entity.getObjectType());
        response.setValueUnit(entity.getValueUnit());
        response.setValuePrecision(entity.getValuePrecision());
        response.setMappingJson(entity.getMappingJson());
        response.setEnabled(entity.getEnabled());
        response.setImplementationCount(entity.getImplementationCount() == null ? Long.valueOf(0L) : entity.getImplementationCount());
        response.setDescription(entity.getDescription());
        response.setCreatedAt(entity.getCreatedAt());
        response.setUpdatedAt(entity.getUpdatedAt());
        return response;
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

    private String upper(String value) {
        return trim(value).toUpperCase(Locale.ROOT);
    }

    private String trim(String value) {
        return value == null ? "" : value.trim();
    }
}
