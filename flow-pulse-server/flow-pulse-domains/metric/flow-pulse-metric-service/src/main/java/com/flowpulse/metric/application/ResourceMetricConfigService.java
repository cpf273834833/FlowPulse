package com.flowpulse.metric.application;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.flowpulse.common.BusinessException;
import com.flowpulse.common.ErrorCode;
import com.flowpulse.common.IdGenerator;
import com.flowpulse.common.StatCard;
import com.flowpulse.executor.domain.model.ExecutorNodeEntity;
import com.flowpulse.executor.infrastructure.persistence.mapper.ExecutorNodeMapper;
import com.flowpulse.metric.api.request.ResourceMetricConfigQueryRequest;
import com.flowpulse.metric.api.request.ResourceMetricConfigSaveRequest;
import com.flowpulse.metric.api.response.PageResponse;
import com.flowpulse.metric.api.response.MetricSampleResponse;
import com.flowpulse.metric.api.response.ResourceMetricConfigPageResponse;
import com.flowpulse.metric.api.response.ResourceMetricConfigResponse;
import com.flowpulse.metric.domain.model.MetricDefinitionEntity;
import com.flowpulse.metric.domain.model.MetricImplementationEntity;
import com.flowpulse.metric.domain.model.MetricSampleEntity;
import com.flowpulse.metric.domain.model.ResourceMetricConfigEntity;
import com.flowpulse.metric.infrastructure.persistence.mapper.MetricDefinitionMapper;
import com.flowpulse.metric.infrastructure.persistence.mapper.MetricImplementationMapper;
import com.flowpulse.metric.infrastructure.persistence.mapper.MetricSampleMapper;
import com.flowpulse.metric.infrastructure.persistence.mapper.ResourceMetricConfigMapper;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;

@Service
public class ResourceMetricConfigService {
    private static final Set<String> MODES = new HashSet<String>(Arrays.asList("SERVER", "SSH", "AGENT", "EXPRESSION"));

    private final MetricDefinitionMapper metricDefinitionMapper;
    private final MetricImplementationMapper metricImplementationMapper;
    private final ResourceMetricConfigMapper resourceMetricConfigMapper;
    private final ExecutorNodeMapper executorNodeMapper;
    private final MetricSampleMapper metricSampleMapper;
    private final ObjectMapper objectMapper;

    public ResourceMetricConfigService(MetricDefinitionMapper metricDefinitionMapper,
                                       MetricImplementationMapper metricImplementationMapper,
                                       ResourceMetricConfigMapper resourceMetricConfigMapper,
                                       ExecutorNodeMapper executorNodeMapper,
                                       MetricSampleMapper metricSampleMapper,
                                       ObjectMapper objectMapper) {
        this.metricDefinitionMapper = metricDefinitionMapper;
        this.metricImplementationMapper = metricImplementationMapper;
        this.resourceMetricConfigMapper = resourceMetricConfigMapper;
        this.executorNodeMapper = executorNodeMapper;
        this.metricSampleMapper = metricSampleMapper;
        this.objectMapper = objectMapper;
    }

    public ResourceMetricConfigPageResponse page(String tenantId, ResourceMetricConfigQueryRequest request) {
        ResourceMetricConfigQueryRequest query = request == null ? new ResourceMetricConfigQueryRequest() : request;
        int pageNo = positive(query.getPageNo(), 1);
        int pageSize = bounded(query.getPageSize(), 10, 100);
        Boolean enabled = parseEnabled(query.getEnabled());
        List<ResourceMetricConfigEntity> rows = resourceMetricConfigMapper.selectPage(
                tenantId, trim(query.getKeyword()), upper(query.getObjectType()), trim(query.getObjectId()),
                trim(query.getInfrastructureId()), trim(query.getEnvId()), trim(query.getRegionId()),
                trim(query.getMetricDefinitionId()), enabled, (pageNo - 1) * pageSize, pageSize);
        long total = resourceMetricConfigMapper.countPage(
                tenantId, trim(query.getKeyword()), upper(query.getObjectType()), trim(query.getObjectId()),
                trim(query.getInfrastructureId()), trim(query.getEnvId()), trim(query.getRegionId()),
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

    public List<MetricSampleResponse> latestSamples(String tenantId, String configId) {
        require(tenantId, configId);
        return toSampleResponses(metricSampleMapper.selectLatestSeriesByConfigId(tenantId, configId));
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
        if (isBuiltInImplementation(implementation)) {
            executionMode = trim(implementation.getExecutionMode());
        } else if (executionMode.length() == 0 && implementation != null) {
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
        entity.setParameterSignature(parameterSignature(entity.getParameterJson()));
        entity.setEnabled(request.getEnabled() == null ? Boolean.TRUE : request.getEnabled());
        entity.setDescription(trim(request.getDescription()));
        validateExecutionChannel(tenantId, entity);
    }

    private boolean isBuiltInImplementation(MetricImplementationEntity implementation) {
        if (implementation == null) {
            return false;
        }
        if (Boolean.TRUE.equals(implementation.getSystemBuiltin())) {
            return true;
        }
        String implementationType = upper(implementation.getImplementationType());
        return "JAVA".equals(implementationType)
                || "BUILT_IN".equals(implementationType)
                || trim(implementation.getBuiltInCollector()).length() > 0;
    }

    private void validateExecutionChannel(String tenantId, ResourceMetricConfigEntity entity) {
        if (!Boolean.TRUE.equals(entity.getEnabled())) {
            return;
        }
        if ("SSH".equals(entity.getExecutionMode())) {
            ExecutorNodeEntity node = requireExecutorNode(tenantId, entity.getExecutorNodeId());
            if (!Boolean.TRUE.equals(node.getSshSupported())) {
                throw new BusinessException(ErrorCode.VALIDATION_FAILED, "metric.executor.node.ssh.required");
            }
        }
        if ("AGENT".equals(entity.getExecutionMode())) {
            ExecutorNodeEntity node = requireExecutorNode(tenantId, entity.getExecutorNodeId());
            if (!Boolean.TRUE.equals(node.getAgentSupported())) {
                throw new BusinessException(ErrorCode.VALIDATION_FAILED, "metric.executor.node.agent.required");
            }
        }
    }

    private ExecutorNodeEntity requireExecutorNode(String tenantId, String executorNodeId) {
        if (trim(executorNodeId).length() == 0) {
            throw new BusinessException(ErrorCode.VALIDATION_FAILED, "metric.executor.node.required");
        }
        ExecutorNodeEntity node = executorNodeMapper.selectById(tenantId, executorNodeId);
        if (node == null) {
            throw new BusinessException(ErrorCode.RESOURCE_NOT_FOUND, "executor.node.not.found");
        }
        return node;
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
                tenantId, upper(request.getObjectType()), trim(request.getObjectId()), trim(request.getMetricDefinitionId()),
                parameterSignature(trim(request.getParameterJson())));
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
        response.setParameterSignature(entity.getParameterSignature());
        response.setEnabled(entity.getEnabled());
        response.setTaskStatus(entity.getTaskStatus());
        response.setLastCollectStatus(entity.getLastCollectStatus());
        response.setLastCollectMessage(entity.getLastCollectMessage());
        response.setLastCollectAt(entity.getLastCollectAt());
        response.setNextCollectAt(entity.getNextCollectAt());
        response.setCurrentValue(entity.getCurrentValue());
        response.setCurrentValueAt(entity.getCurrentValueAt());
        response.setDescription(entity.getDescription());
        response.setCreatedAt(entity.getCreatedAt());
        response.setUpdatedAt(entity.getUpdatedAt());
        return response;
    }

    private List<MetricSampleResponse> toSampleResponses(List<MetricSampleEntity> rows) {
        List<MetricSampleResponse> responses = new ArrayList<MetricSampleResponse>();
        if (rows == null) {
            return responses;
        }
        for (MetricSampleEntity row : rows) {
            MetricSampleResponse response = new MetricSampleResponse();
            response.setId(row.getId());
            response.setConfigId(row.getConfigId());
            response.setMetricCode(row.getMetricCode());
            response.setObjectType(row.getObjectType());
            response.setObjectId(row.getObjectId());
            response.setObjectCode(row.getObjectCode());
            response.setInfrastructureType(row.getInfrastructureType());
            response.setInfrastructureId(row.getInfrastructureId());
            response.setInstance(row.getInstance());
            response.setSeriesType(row.getSeriesType());
            response.setQuality(row.getQuality());
            response.setValue(row.getValue());
            response.setCollectedAt(row.getCollectedAt());
            response.setMetadataJson(row.getMetadataJson());
            responses.add(response);
        }
        return responses;
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

    private String parameterSignature(String parameterJson) {
        return sha256(canonicalParameterJson(parameterJson));
    }

    private String canonicalParameterJson(String parameterJson) {
        String text = trim(parameterJson);
        if (text.length() == 0) {
            return "";
        }
        try {
            JsonNode node = objectMapper.readTree(text);
            return objectMapper.writeValueAsString(node);
        } catch (Exception exception) {
            return text;
        }
    }

    private String sha256(String value) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] encoded = digest.digest(value.getBytes(StandardCharsets.UTF_8));
            StringBuilder builder = new StringBuilder(encoded.length * 2);
            for (byte item : encoded) {
                String hex = Integer.toHexString(0xff & item);
                if (hex.length() == 1) {
                    builder.append('0');
                }
                builder.append(hex);
            }
            return builder.toString();
        } catch (NoSuchAlgorithmException exception) {
            throw new IllegalStateException("SHA-256 is not available.", exception);
        }
    }
}
