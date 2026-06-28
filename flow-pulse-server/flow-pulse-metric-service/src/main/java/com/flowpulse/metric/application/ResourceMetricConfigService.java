package com.flowpulse.metric.application;

import com.flowpulse.common.BusinessException;
import com.flowpulse.common.ErrorCode;
import com.flowpulse.common.IdGenerator;
import com.flowpulse.common.StatCard;
import com.flowpulse.metric.api.request.ResourceMetricConfigQueryRequest;
import com.flowpulse.metric.api.request.ResourceMetricConfigSaveRequest;
import com.flowpulse.metric.api.response.PageResponse;
import com.flowpulse.metric.api.response.ResourceMetricConfigPageResponse;
import com.flowpulse.metric.api.response.ResourceMetricConfigResponse;
import com.flowpulse.metric.domain.model.MetricDefinitionEntity;
import com.flowpulse.metric.domain.model.MetricImplementationEntity;
import com.flowpulse.metric.domain.model.ResourceMetricConfigEntity;
import com.flowpulse.metric.infrastructure.persistence.mapper.MetricDefinitionMapper;
import com.flowpulse.metric.infrastructure.persistence.mapper.MetricImplementationMapper;
import com.flowpulse.metric.infrastructure.persistence.mapper.ResourceMetricConfigMapper;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;

@Service
public class ResourceMetricConfigService {
    private static final Set<String> MODES = new HashSet<String>(Arrays.asList("SERVER", "SSH", "AGENT", "EXPRESSION"));

    private final MetricDefinitionMapper metricDefinitionMapper;
    private final MetricImplementationMapper metricImplementationMapper;
    private final ResourceMetricConfigMapper resourceMetricConfigMapper;

    public ResourceMetricConfigService(MetricDefinitionMapper metricDefinitionMapper,
                                       MetricImplementationMapper metricImplementationMapper,
                                       ResourceMetricConfigMapper resourceMetricConfigMapper) {
        this.metricDefinitionMapper = metricDefinitionMapper;
        this.metricImplementationMapper = metricImplementationMapper;
        this.resourceMetricConfigMapper = resourceMetricConfigMapper;
    }

    public ResourceMetricConfigPageResponse page(String tenantId, ResourceMetricConfigQueryRequest request) {
        ResourceMetricConfigQueryRequest query = request == null ? new ResourceMetricConfigQueryRequest() : request;
        int pageNo = positive(query.getPageNo(), 1);
        int pageSize = bounded(query.getPageSize(), 10, 100);
        Boolean enabled = parseEnabled(query.getEnabled());
        List<ResourceMetricConfigEntity> rows = resourceMetricConfigMapper.selectPage(
                tenantId, trim(query.getKeyword()), upper(query.getObjectType()), trim(query.getObjectId()),
                trim(query.getMetricDefinitionId()), enabled, (pageNo - 1) * pageSize, pageSize);
        long total = resourceMetricConfigMapper.countPage(
                tenantId, trim(query.getKeyword()), upper(query.getObjectType()), trim(query.getObjectId()),
                trim(query.getMetricDefinitionId()), enabled);

        PageResponse<ResourceMetricConfigResponse> page = new PageResponse<ResourceMetricConfigResponse>();
        page.setRecords(toResponses(rows));
        page.setTotal(total);
        page.setPageNo(pageNo);
        page.setPageSize(pageSize);

        ResourceMetricConfigPageResponse response = new ResourceMetricConfigPageResponse();
        response.setConfigs(page);
        response.setStats(buildStats(tenantId));
        return response;
    }

    public ResourceMetricConfigResponse detail(String tenantId, String id) {
        return toResponse(require(tenantId, id));
    }

    @Transactional
    public ResourceMetricConfigResponse create(String tenantId, ResourceMetricConfigSaveRequest request) {
        assertUnique(tenantId, null, request);
        long now = System.currentTimeMillis();
        ResourceMetricConfigEntity entity = new ResourceMetricConfigEntity();
        entity.setId(IdGenerator.nextId());
        entity.setTenantId(tenantId);
        fill(tenantId, entity, request);
        entity.setTaskStatus(Boolean.TRUE.equals(entity.getEnabled()) ? "SCHEDULED" : "DISABLED");
        entity.setLastCollectStatus("UNKNOWN");
        entity.setLastCollectMessage("");
        entity.setLastCollectAt(null);
        entity.setNextCollectAt(Boolean.TRUE.equals(entity.getEnabled()) ? Long.valueOf(now + entity.getIntervalSec().intValue() * 1000L) : null);
        entity.setCreatedAt(Long.valueOf(now));
        entity.setUpdatedAt(Long.valueOf(now));
        resourceMetricConfigMapper.insert(entity);
        return detail(tenantId, entity.getId());
    }

    @Transactional
    public ResourceMetricConfigResponse update(String tenantId, String id, ResourceMetricConfigSaveRequest request) {
        ResourceMetricConfigEntity entity = require(tenantId, id);
        assertUnique(tenantId, id, request);
        fill(tenantId, entity, request);
        entity.setTaskStatus(Boolean.TRUE.equals(entity.getEnabled()) ? "SCHEDULED" : "DISABLED");
        entity.setNextCollectAt(Boolean.TRUE.equals(entity.getEnabled()) ? Long.valueOf(System.currentTimeMillis() + entity.getIntervalSec().intValue() * 1000L) : null);
        entity.setUpdatedAt(Long.valueOf(System.currentTimeMillis()));
        resourceMetricConfigMapper.update(entity);
        return detail(tenantId, id);
    }

    @Transactional
    public void delete(String tenantId, String id) {
        require(tenantId, id);
        resourceMetricConfigMapper.deleteById(tenantId, id);
    }

    private void fill(String tenantId, ResourceMetricConfigEntity entity, ResourceMetricConfigSaveRequest request) {
        MetricDefinitionEntity definition = metricDefinitionMapper.selectById(tenantId, request.getMetricDefinitionId());
        if (definition == null) {
            throw new BusinessException(ErrorCode.RESOURCE_NOT_FOUND, "metric.not.found");
        }
        MetricImplementationEntity implementation = resolveImplementation(tenantId, definition.getId(), request.getImplementationId());
        String executionMode = trim(request.getExecutionMode());
        if (executionMode.length() == 0 && implementation != null) {
            executionMode = implementation.getExecutionMode();
        }
        entity.setObjectType(upper(request.getObjectType()));
        entity.setObjectId(trim(request.getObjectId()));
        entity.setObjectCode(trim(request.getObjectCode()));
        entity.setObjectName(trim(request.getObjectName()));
        entity.setMetricDefinitionId(definition.getId());
        entity.setImplementationId(implementation == null ? "" : implementation.getId());
        entity.setExecutionMode(normalize(executionMode, MODES, "metric.execution.mode.invalid"));
        entity.setExecutorNodeId(trim(request.getExecutorNodeId()));
        entity.setIntervalSec(request.getIntervalSec() == null ? Integer.valueOf(60) : request.getIntervalSec());
        entity.setParameterJson(trim(request.getParameterJson()));
        entity.setEnabled(request.getEnabled() == null ? Boolean.TRUE : request.getEnabled());
        entity.setDescription(trim(request.getDescription()));
    }

    private MetricImplementationEntity resolveImplementation(String tenantId, String metricDefinitionId, String implementationId) {
        if (trim(implementationId).length() > 0) {
            MetricImplementationEntity implementation = metricImplementationMapper.selectById(tenantId, implementationId);
            if (implementation == null || !metricDefinitionId.equals(implementation.getMetricDefinitionId())) {
                throw new BusinessException(ErrorCode.RESOURCE_NOT_FOUND, "metric.implementation.not.found");
            }
            return implementation;
        }
        MetricImplementationEntity defaultImplementation = metricImplementationMapper.selectDefaultByMetric(tenantId, metricDefinitionId);
        if (defaultImplementation == null) {
            throw new BusinessException(ErrorCode.BUSINESS_RULE_VIOLATED, "metric.implementation.default.required");
        }
        return defaultImplementation;
    }

    private ResourceMetricConfigEntity require(String tenantId, String id) {
        ResourceMetricConfigEntity entity = resourceMetricConfigMapper.selectById(tenantId, id);
        if (entity == null) {
            throw new BusinessException(ErrorCode.RESOURCE_NOT_FOUND, "metric.resource.config.not.found");
        }
        return entity;
    }

    private void assertUnique(String tenantId, String currentId, ResourceMetricConfigSaveRequest request) {
        ResourceMetricConfigEntity entity = resourceMetricConfigMapper.selectByObjectMetric(
                tenantId, upper(request.getObjectType()), trim(request.getObjectId()), trim(request.getMetricDefinitionId()));
        if (entity != null && !entity.getId().equals(currentId)) {
            throw new BusinessException(ErrorCode.CONFLICT, "metric.resource.config.exists");
        }
    }

    private List<ResourceMetricConfigResponse> toResponses(List<ResourceMetricConfigEntity> rows) {
        List<ResourceMetricConfigResponse> responses = new ArrayList<ResourceMetricConfigResponse>();
        for (ResourceMetricConfigEntity row : rows) {
            responses.add(toResponse(row));
        }
        return responses;
    }

    private ResourceMetricConfigResponse toResponse(ResourceMetricConfigEntity entity) {
        ResourceMetricConfigResponse response = new ResourceMetricConfigResponse();
        response.setId(entity.getId());
        response.setObjectType(entity.getObjectType());
        response.setObjectId(entity.getObjectId());
        response.setObjectCode(entity.getObjectCode());
        response.setObjectName(entity.getObjectName());
        response.setMetricDefinitionId(entity.getMetricDefinitionId());
        response.setMetricCode(entity.getMetricCode());
        response.setMetricName(entity.getMetricName());
        response.setImplementationId(entity.getImplementationId());
        response.setImplementationCode(entity.getImplementationCode());
        response.setImplementationName(entity.getImplementationName());
        response.setImplementationType(entity.getImplementationType());
        response.setExecutionMode(entity.getExecutionMode());
        response.setExecutorNodeId(entity.getExecutorNodeId());
        response.setIntervalSec(entity.getIntervalSec());
        response.setParameterJson(entity.getParameterJson());
        response.setEnabled(entity.getEnabled());
        response.setTaskStatus(entity.getTaskStatus());
        response.setLastCollectStatus(entity.getLastCollectStatus());
        response.setLastCollectMessage(entity.getLastCollectMessage());
        response.setLastCollectAt(entity.getLastCollectAt());
        response.setNextCollectAt(entity.getNextCollectAt());
        response.setDescription(entity.getDescription());
        response.setCreatedAt(entity.getCreatedAt());
        response.setUpdatedAt(entity.getUpdatedAt());
        return response;
    }

    private List<StatCard> buildStats(String tenantId) {
        List<StatCard> stats = new ArrayList<StatCard>();
        stats.add(new StatCard("资源指标", String.valueOf(resourceMetricConfigMapper.countAll(tenantId)), "已启用或维护的采集配置"));
        stats.add(new StatCard("启用任务", String.valueOf(resourceMetricConfigMapper.countEnabled(tenantId)), "等待调度执行"));
        stats.add(new StatCard("覆盖对象", String.valueOf(resourceMetricConfigMapper.countObjects(tenantId)), "已配置指标的对象数"));
        stats.add(new StatCard("采集异常", String.valueOf(resourceMetricConfigMapper.countError(tenantId)), "最近一次采集失败"));
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
