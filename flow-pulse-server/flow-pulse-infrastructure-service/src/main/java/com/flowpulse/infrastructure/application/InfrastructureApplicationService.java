package com.flowpulse.infrastructure.application;

import com.flowpulse.common.BusinessException;
import com.flowpulse.common.ErrorCode;
import com.flowpulse.common.IdGenerator;
import com.flowpulse.common.MessageKeys;
import com.flowpulse.common.StatCard;
import com.flowpulse.infrastructure.api.request.InfrastructureQueryRequest;
import com.flowpulse.infrastructure.api.request.InfrastructureResourceQueryRequest;
import com.flowpulse.infrastructure.api.request.InfrastructureSaveRequest;
import com.flowpulse.infrastructure.api.response.InfrastructureActionResponse;
import com.flowpulse.infrastructure.api.response.InfrastructurePageResponse;
import com.flowpulse.infrastructure.api.response.InfrastructureResourceResponse;
import com.flowpulse.infrastructure.api.response.InfrastructureResponse;
import com.flowpulse.infrastructure.api.response.PageResponse;
import com.flowpulse.infrastructure.domain.model.InfrastructureEntity;
import com.flowpulse.infrastructure.domain.model.InfrastructureResourceEntity;
import com.flowpulse.infrastructure.infrastructure.connector.ConnectionCheckResult;
import com.flowpulse.infrastructure.infrastructure.connector.DiscoveredResource;
import com.flowpulse.infrastructure.infrastructure.connector.InfrastructureConnector;
import com.flowpulse.infrastructure.infrastructure.persistence.mapper.InfrastructureMapper;
import com.flowpulse.infrastructure.infrastructure.persistence.mapper.InfrastructureResourceMapper;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

@Service
public class InfrastructureApplicationService {
    private static final String TYPE_KAFKA = "KAFKA";
    private static final String TYPE_ES = "ELASTICSEARCH";
    private static final String TYPE_SPARK = "SPARK";
    private static final String RUN_ENABLED = "ENABLED";
    private static final String RUN_DISABLED = "DISABLED";
    private static final String CONNECTION_UNKNOWN = "UNKNOWN";
    private static final String CONNECTION_NORMAL = "NORMAL";
    private static final String CONNECTION_ERROR = "ERROR";
    private static final String AUTH_NONE = "NONE";
    private static final String SYNC_MODE_REFRESH = "REFRESH";
    private static final String SYNC_MODE_APPEND = "APPEND";
    private static final String SYNC_MODE_RECONCILE = "RECONCILE";
    private static final long DISABLED_NORMAL_TTL_MS = 10L * 60L * 1000L;

    private final InfrastructureMapper infrastructureMapper;
    private final InfrastructureResourceMapper resourceMapper;
    private final List<InfrastructureConnector> connectors;

    public InfrastructureApplicationService(InfrastructureMapper infrastructureMapper,
                                            InfrastructureResourceMapper resourceMapper,
                                            List<InfrastructureConnector> connectors) {
        this.infrastructureMapper = infrastructureMapper;
        this.resourceMapper = resourceMapper;
        this.connectors = connectors;
    }

    public InfrastructurePageResponse page(String tenantId, InfrastructureQueryRequest request) {
        InfrastructureQueryRequest query = request == null ? new InfrastructureQueryRequest() : request;
        int pageNo = positive(query.getPageNo(), 1);
        int pageSize = bounded(query.getPageSize(), 10, 100);
        String keyword = trim(query.getKeyword());
        String type = trim(query.getType()).toUpperCase(Locale.ROOT);
        String envId = trim(query.getEnvId());
        String regionId = trim(query.getRegionId());
        String status = trim(query.getStatus()).toUpperCase(Locale.ROOT);
        int offset = (pageNo - 1) * pageSize;
        List<InfrastructureEntity> entities = infrastructureMapper.selectPage(tenantId, keyword, type, envId, regionId, status, offset, pageSize);
        long total = infrastructureMapper.countPage(tenantId, keyword, type, envId, regionId, status);

        PageResponse<InfrastructureResponse> page = new PageResponse<InfrastructureResponse>();
        page.setPageNo(pageNo);
        page.setPageSize(pageSize);
        page.setTotal(total);
        page.setRecords(toResponses(entities));

        InfrastructurePageResponse response = new InfrastructurePageResponse();
        response.setInfrastructures(page);
        response.setStats(buildStats(infrastructureMapper.selectAll(tenantId)));
        return response;
    }

    public InfrastructureResponse detail(String tenantId, String id) {
        return toResponse(require(tenantId, id));
    }

    @Transactional
    public InfrastructureResponse create(String tenantId, InfrastructureSaveRequest request) {
        assertType(request.getType());
        assertCodeUnique(tenantId, null, request.getCode());
        long now = System.currentTimeMillis();
        InfrastructureEntity entity = new InfrastructureEntity();
        entity.setId(IdGenerator.nextId());
        entity.setTenantId(tenantId);
        fill(entity, request);
        entity.setRunStatus(RUN_DISABLED);
        entity.setConnectionStatus(CONNECTION_UNKNOWN);
        entity.setCreatedAt(now);
        entity.setUpdatedAt(now);
        infrastructureMapper.insert(entity);
        return toResponse(entity);
    }

    @Transactional
    public InfrastructureResponse update(String tenantId, String id, InfrastructureSaveRequest request) {
        assertType(request.getType());
        InfrastructureEntity entity = require(tenantId, id);
        assertCodeUnique(tenantId, id, request.getCode());
        fill(entity, request);
        entity.setUpdatedAt(System.currentTimeMillis());
        infrastructureMapper.update(entity);
        return toResponse(require(tenantId, id));
    }

    @Transactional
    public InfrastructureResponse updateRunStatus(String tenantId, String id, boolean enabled) {
        InfrastructureEntity entity = require(tenantId, id);
        entity.setRunStatus(enabled ? RUN_ENABLED : RUN_DISABLED);
        entity.setUpdatedAt(System.currentTimeMillis());
        infrastructureMapper.updateRuntime(entity);
        return toResponse(require(tenantId, id));
    }

    @Transactional
    public void delete(String tenantId, String id) {
        require(tenantId, id);
        if (resourceMapper.countByInfrastructureId(tenantId, id) > 0) {
            resourceMapper.deleteByInfrastructureId(tenantId, id);
        }
        infrastructureMapper.deleteById(tenantId, id);
    }

    @Transactional
    public InfrastructureActionResponse testConnection(String tenantId, String id) {
        InfrastructureEntity entity = require(tenantId, id);
        ConnectionCheckResult result = connector(entity).test(entity);
        long now = System.currentTimeMillis();
        entity.setConnectionStatus(result.isSuccess() ? CONNECTION_NORMAL : CONNECTION_ERROR);
        entity.setLastTestMessage(limit(result.getMessage(), 1000));
        entity.setLastTestAt(now);
        entity.setUpdatedAt(now);
        infrastructureMapper.updateRuntime(entity);
        return new InfrastructureActionResponse(entity.getConnectionStatus(), entity.getLastTestMessage(), now);
    }

    @Transactional
    public InfrastructureActionResponse syncResources(String tenantId, String id, String syncMode) {
        InfrastructureEntity entity = require(tenantId, id);
        long now = System.currentTimeMillis();
        String mode = normalizeSyncMode(defaultText(syncMode, entity.getSyncMode()));
        try {
            List<DiscoveredResource> resources = connector(entity).discover(entity);
            if (SYNC_MODE_REFRESH.equals(mode)) {
                resourceMapper.deleteByInfrastructureId(tenantId, id);
            }
            for (DiscoveredResource resource : resources) {
                InfrastructureResourceEntity row = new InfrastructureResourceEntity();
                row.setId(IdGenerator.nextId());
                row.setTenantId(tenantId);
                row.setInfrastructureId(id);
                row.setResourceType(resource.getResourceType());
                row.setResourceName(resource.getResourceName());
                row.setResourceCode(resource.getResourceCode());
                row.setStatus(resource.getStatus());
                row.setMetadataJson(resource.getMetadataJson());
                row.setLastSyncAt(now);
                row.setCreatedAt(now);
                row.setUpdatedAt(now);
                resourceMapper.upsert(row);
            }
            if (SYNC_MODE_RECONCILE.equals(mode)) {
                resourceMapper.deleteNotSyncedAt(tenantId, id, now);
            }
            entity.setLastSyncAt(now);
            entity.setLastSyncMessage("sync success, count=" + resources.size());
            entity.setUpdatedAt(now);
            infrastructureMapper.updateRuntime(entity);
            return new InfrastructureActionResponse("SUCCESS", entity.getLastSyncMessage(), now);
        } catch (RuntimeException exception) {
            entity.setLastSyncAt(now);
            entity.setLastSyncMessage(limit(exception.getMessage(), 1000));
            entity.setUpdatedAt(now);
            infrastructureMapper.updateRuntime(entity);
            return new InfrastructureActionResponse("ERROR", entity.getLastSyncMessage(), now);
        }
    }

    public PageResponse<InfrastructureResourceResponse> resources(String tenantId, String id, InfrastructureResourceQueryRequest request) {
        require(tenantId, id);
        InfrastructureResourceQueryRequest query = request == null ? new InfrastructureResourceQueryRequest() : request;
        int pageNo = positive(query.getPageNo(), 1);
        int pageSize = bounded(query.getPageSize(), 10, 100);
        String keyword = trim(query.getKeyword());
        String resourceType = trim(query.getResourceType());
        int offset = (pageNo - 1) * pageSize;
        List<InfrastructureResourceEntity> entities = resourceMapper.selectPage(tenantId, id, keyword, resourceType, offset, pageSize);
        long total = resourceMapper.countPage(tenantId, id, keyword, resourceType);
        PageResponse<InfrastructureResourceResponse> page = new PageResponse<InfrastructureResourceResponse>();
        page.setPageNo(pageNo);
        page.setPageSize(pageSize);
        page.setTotal(total);
        List<InfrastructureResourceResponse> records = new ArrayList<InfrastructureResourceResponse>();
        for (InfrastructureResourceEntity entity : entities) {
            records.add(toResourceResponse(entity));
        }
        page.setRecords(records);
        return page;
    }

    private void fill(InfrastructureEntity entity, InfrastructureSaveRequest request) {
        entity.setType(trim(request.getType()).toUpperCase(Locale.ROOT));
        entity.setCode(trim(request.getCode()));
        entity.setName(trim(request.getName()));
        entity.setEnvId(trim(request.getEnvId()));
        entity.setRegionId(trim(request.getRegionId()));
        entity.setEndpoint(trim(request.getEndpoint()));
        entity.setAuthType(defaultText(request.getAuthType(), AUTH_NONE).toUpperCase(Locale.ROOT));
        entity.setUsername(trim(request.getUsername()));
        entity.setPassword(trim(request.getPassword()));
        entity.setApiKey(trim(request.getApiKey()));
        entity.setSyncScope(trim(request.getSyncScope()));
        entity.setSyncMode(normalizeSyncMode(request.getSyncMode()));
        entity.setSyncEnabled(request.getSyncEnabled() == null ? Boolean.TRUE : request.getSyncEnabled());
        entity.setSyncIntervalSec(request.getSyncIntervalSec() == null ? Integer.valueOf(300) : request.getSyncIntervalSec());
        entity.setDescription(trim(request.getDescription()));
    }

    private InfrastructureEntity require(String tenantId, String id) {
        InfrastructureEntity entity = infrastructureMapper.selectById(tenantId, id);
        if (entity == null) {
            throw new BusinessException(ErrorCode.RESOURCE_NOT_FOUND, MessageKeys.INFRASTRUCTURE_NOT_FOUND);
        }
        return entity;
    }

    private void assertCodeUnique(String tenantId, String currentId, String code) {
        InfrastructureEntity entity = infrastructureMapper.selectByCode(tenantId, trim(code));
        if (entity != null && !entity.getId().equals(currentId)) {
            throw new BusinessException(ErrorCode.CONFLICT, MessageKeys.INFRASTRUCTURE_CODE_EXISTS);
        }
    }

    private void assertType(String type) {
        String value = trim(type).toUpperCase(Locale.ROOT);
        if (!TYPE_KAFKA.equals(value) && !TYPE_ES.equals(value) && !TYPE_SPARK.equals(value)) {
            throw new BusinessException(ErrorCode.VALIDATION_FAILED, MessageKeys.INFRASTRUCTURE_TYPE_INVALID);
        }
    }

    private InfrastructureConnector connector(InfrastructureEntity entity) {
        for (InfrastructureConnector connector : connectors) {
            if (connector.supports(entity.getType())) {
                return connector;
            }
        }
        throw new BusinessException(ErrorCode.BUSINESS_RULE_VIOLATED, MessageKeys.INFRASTRUCTURE_CONNECTOR_NOT_FOUND);
    }

    private List<StatCard> buildStats(List<InfrastructureEntity> entities) {
        int normal = 0;
        int error = 0;
        int enabled = 0;
        Map<String, Integer> typeCounter = new HashMap<String, Integer>();
        for (InfrastructureEntity entity : entities) {
            if (CONNECTION_NORMAL.equals(entity.getConnectionStatus())) {
                normal++;
            }
            if (CONNECTION_ERROR.equals(entity.getConnectionStatus())) {
                error++;
            }
            if (RUN_ENABLED.equals(entity.getRunStatus())) {
                enabled++;
            }
            Integer count = typeCounter.get(entity.getType());
            typeCounter.put(entity.getType(), count == null ? 1 : count + 1);
        }
        List<StatCard> stats = new ArrayList<StatCard>();
        stats.add(new StatCard("infrastructure.total", String.valueOf(entities.size()), "Kafka / Spark / Elasticsearch"));
        stats.add(new StatCard("infrastructure.normal", String.valueOf(normal), "connection normal"));
        stats.add(new StatCard("infrastructure.error", String.valueOf(error), "connection error"));
        stats.add(new StatCard("infrastructure.enabled", String.valueOf(enabled), "enabled instances"));
        stats.add(new StatCard("infrastructure.types", String.valueOf(typeCounter.size()), "type count"));
        return stats;
    }

    private List<InfrastructureResponse> toResponses(List<InfrastructureEntity> entities) {
        List<InfrastructureResponse> responses = new ArrayList<InfrastructureResponse>();
        for (InfrastructureEntity entity : entities) {
            responses.add(toResponse(entity));
        }
        return responses;
    }

    private InfrastructureResponse toResponse(InfrastructureEntity entity) {
        InfrastructureResponse response = new InfrastructureResponse();
        response.setId(entity.getId());
        response.setType(entity.getType());
        response.setCode(entity.getCode());
        response.setName(entity.getName());
        response.setEnvId(entity.getEnvId());
        response.setRegionId(entity.getRegionId());
        response.setEndpoint(entity.getEndpoint());
        response.setAuthType(entity.getAuthType());
        response.setUsername(entity.getUsername());
        response.setPassword(entity.getPassword());
        response.setApiKey(entity.getApiKey());
        response.setSyncScope(entity.getSyncScope());
        response.setSyncMode(defaultText(entity.getSyncMode(), SYNC_MODE_RECONCILE));
        response.setSyncEnabled(entity.getSyncEnabled());
        response.setSyncIntervalSec(entity.getSyncIntervalSec());
        response.setRunStatus(entity.getRunStatus());
        response.setConnectionStatus(viewConnectionStatus(entity));
        response.setLastTestMessage(entity.getLastTestMessage());
        response.setLastTestAt(entity.getLastTestAt());
        response.setLastSyncAt(entity.getLastSyncAt());
        response.setLastSyncMessage(entity.getLastSyncMessage());
        response.setDescription(entity.getDescription());
        response.setCreatedAt(entity.getCreatedAt());
        response.setUpdatedAt(entity.getUpdatedAt());
        return response;
    }

    private InfrastructureResourceResponse toResourceResponse(InfrastructureResourceEntity entity) {
        InfrastructureResourceResponse response = new InfrastructureResourceResponse();
        response.setId(entity.getId());
        response.setInfrastructureId(entity.getInfrastructureId());
        response.setResourceType(entity.getResourceType());
        response.setResourceName(entity.getResourceName());
        response.setResourceCode(entity.getResourceCode());
        response.setStatus(entity.getStatus());
        response.setMetadataJson(entity.getMetadataJson());
        response.setLastSyncAt(entity.getLastSyncAt());
        return response;
    }

    private int positive(Integer value, int defaultValue) {
        return value == null || value.intValue() <= 0 ? defaultValue : value.intValue();
    }

    private int bounded(Integer value, int defaultValue, int max) {
        int result = positive(value, defaultValue);
        return Math.min(result, max);
    }

    private String defaultText(String value, String defaultValue) {
        String text = trim(value);
        return text.length() == 0 ? defaultValue : text;
    }

    private String trim(String value) {
        return value == null ? "" : value.trim();
    }

    private String limit(String value, int maxLength) {
        String text = trim(value);
        return text.length() > maxLength ? text.substring(0, maxLength) : text;
    }

    private String normalizeSyncMode(String syncMode) {
        String value = defaultText(syncMode, SYNC_MODE_RECONCILE).toUpperCase(Locale.ROOT);
        if (SYNC_MODE_REFRESH.equals(value) || SYNC_MODE_APPEND.equals(value) || SYNC_MODE_RECONCILE.equals(value)) {
            return value;
        }
        throw new BusinessException(ErrorCode.VALIDATION_FAILED, "infrastructure.sync.mode.invalid");
    }

    private String viewConnectionStatus(InfrastructureEntity entity) {
        if (!RUN_DISABLED.equals(entity.getRunStatus()) || !CONNECTION_NORMAL.equals(entity.getConnectionStatus())) {
            return entity.getConnectionStatus();
        }
        Long lastTestAt = entity.getLastTestAt();
        if (lastTestAt == null || System.currentTimeMillis() - lastTestAt.longValue() > DISABLED_NORMAL_TTL_MS) {
            return CONNECTION_UNKNOWN;
        }
        return entity.getConnectionStatus();
    }
}
