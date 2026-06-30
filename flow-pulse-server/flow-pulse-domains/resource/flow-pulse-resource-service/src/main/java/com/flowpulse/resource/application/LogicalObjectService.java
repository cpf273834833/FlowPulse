package com.flowpulse.resource.application;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.flowpulse.common.BusinessException;
import com.flowpulse.common.ErrorCode;
import com.flowpulse.common.IdGenerator;
import com.flowpulse.infrastructure.domain.model.InfrastructureResourceEntity;
import com.flowpulse.infrastructure.infrastructure.persistence.mapper.InfrastructureResourceMapper;
import com.flowpulse.resource.api.request.LogicalObjectInstanceQueryRequest;
import com.flowpulse.resource.api.request.LogicalObjectQueryRequest;
import com.flowpulse.resource.api.request.LogicalObjectSaveRequest;
import com.flowpulse.resource.api.response.LogicalObjectInstanceResponse;
import com.flowpulse.resource.api.response.LogicalObjectResponse;
import com.flowpulse.resource.api.response.PageResponse;
import com.flowpulse.resource.domain.model.LogicalObjectEntity;
import com.flowpulse.resource.domain.model.LogicalObjectInstanceEntity;
import com.flowpulse.resource.infrastructure.persistence.mapper.LogicalObjectInstanceMapper;
import com.flowpulse.resource.infrastructure.persistence.mapper.LogicalObjectMapper;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.regex.Pattern;
import java.util.regex.PatternSyntaxException;

@Service
public class LogicalObjectService {
    private static final ObjectMapper OBJECT_MAPPER = new ObjectMapper();
    private static final Set<String> OBJECT_TYPES = new HashSet<String>(Arrays.asList(
            "SPARK_LOGICAL_JOB", "KAFKA_LOGICAL_CONSUMER_GROUP", "APPLICATION_LOGICAL_SERVICE", "CUSTOM_LOGICAL_OBJECT"));
    private static final Set<String> SOURCE_TYPES = new HashSet<String>(Arrays.asList("SPARK", "KAFKA", "APPLICATION", "MANUAL"));
    private static final Set<String> MATCH_TYPES = new HashSet<String>(Arrays.asList("EXACT", "PREFIX", "REGEX", "EXPRESSION"));

    private final LogicalObjectMapper logicalObjectMapper;
    private final LogicalObjectInstanceMapper instanceMapper;
    private final InfrastructureResourceMapper infrastructureResourceMapper;

    public LogicalObjectService(LogicalObjectMapper logicalObjectMapper,
                                LogicalObjectInstanceMapper instanceMapper,
                                InfrastructureResourceMapper infrastructureResourceMapper) {
        this.logicalObjectMapper = logicalObjectMapper;
        this.instanceMapper = instanceMapper;
        this.infrastructureResourceMapper = infrastructureResourceMapper;
    }

    public PageResponse<LogicalObjectResponse> page(String tenantId, LogicalObjectQueryRequest request) {
        LogicalObjectQueryRequest query = request == null ? new LogicalObjectQueryRequest() : request;
        int pageNo = positive(query.getPageNo(), 1);
        int pageSize = bounded(query.getPageSize(), 10, 100);
        int offset = (pageNo - 1) * pageSize;
        List<LogicalObjectEntity> entities = logicalObjectMapper.selectPage(tenantId, trim(query.getKeyword()),
                trim(query.getEnvId()), trim(query.getRegionId()), upper(query.getObjectType()), upper(query.getSourceType()),
                query.getEnabled(), offset, pageSize);
        long total = logicalObjectMapper.countPage(tenantId, trim(query.getKeyword()), trim(query.getEnvId()),
                trim(query.getRegionId()), upper(query.getObjectType()), upper(query.getSourceType()), query.getEnabled());
        PageResponse<LogicalObjectResponse> page = new PageResponse<LogicalObjectResponse>();
        page.setPageNo(pageNo);
        page.setPageSize(pageSize);
        page.setTotal(total);
        List<LogicalObjectResponse> records = new ArrayList<LogicalObjectResponse>();
        for (LogicalObjectEntity entity : entities) {
            records.add(toResponse(entity));
        }
        page.setRecords(records);
        return page;
    }

    public LogicalObjectResponse detail(String tenantId, String id) {
        return toResponse(require(tenantId, id));
    }

    @Transactional
    public LogicalObjectResponse create(String tenantId, LogicalObjectSaveRequest request) {
        LogicalObjectEntity entity = new LogicalObjectEntity();
        fill(entity, request);
        LogicalObjectEntity exists = logicalObjectMapper.selectByCode(tenantId, entity.getObjectCode());
        if (exists != null) {
            throw new BusinessException(ErrorCode.CONFLICT, "logical.object.code.exists", entity.getObjectCode());
        }
        long now = System.currentTimeMillis();
        entity.setId(IdGenerator.nextId());
        entity.setTenantId(tenantId);
        entity.setCreatedAt(now);
        entity.setUpdatedAt(now);
        logicalObjectMapper.insert(entity);
        return detail(tenantId, entity.getId());
    }

    @Transactional
    public LogicalObjectResponse update(String tenantId, String id, LogicalObjectSaveRequest request) {
        LogicalObjectEntity entity = require(tenantId, id);
        String originCode = entity.getObjectCode();
        fill(entity, request);
        entity.setObjectCode(originCode);
        entity.setUpdatedAt(System.currentTimeMillis());
        logicalObjectMapper.update(entity);
        return detail(tenantId, id);
    }

    @Transactional
    public void delete(String tenantId, String id) {
        require(tenantId, id);
        instanceMapper.deleteByLogicalObjectId(tenantId, id);
        logicalObjectMapper.delete(tenantId, id);
    }

    public PageResponse<LogicalObjectInstanceResponse> instances(String tenantId, String logicalObjectId, LogicalObjectInstanceQueryRequest request) {
        require(tenantId, logicalObjectId);
        LogicalObjectInstanceQueryRequest query = request == null ? new LogicalObjectInstanceQueryRequest() : request;
        int pageNo = positive(query.getPageNo(), 1);
        int pageSize = bounded(query.getPageSize(), 10, 100);
        int offset = (pageNo - 1) * pageSize;
        List<LogicalObjectInstanceEntity> entities = instanceMapper.selectPage(tenantId, logicalObjectId, trim(query.getKeyword()), upper(query.getStatus()), offset, pageSize);
        long total = instanceMapper.countPage(tenantId, logicalObjectId, trim(query.getKeyword()), upper(query.getStatus()));
        PageResponse<LogicalObjectInstanceResponse> page = new PageResponse<LogicalObjectInstanceResponse>();
        page.setPageNo(pageNo);
        page.setPageSize(pageSize);
        page.setTotal(total);
        List<LogicalObjectInstanceResponse> records = new ArrayList<LogicalObjectInstanceResponse>();
        for (LogicalObjectInstanceEntity entity : entities) {
            records.add(toInstanceResponse(entity));
        }
        page.setRecords(records);
        return page;
    }

    @Transactional
    public LogicalObjectResponse resolveInstances(String tenantId, String id) {
        LogicalObjectEntity logicalObject = require(tenantId, id);
        if (trim(logicalObject.getSourceInfrastructureId()).length() == 0) {
            throw new BusinessException(ErrorCode.VALIDATION_FAILED, "logical.object.source.infrastructure.required");
        }
        String resourceType = physicalResourceType(logicalObject.getObjectType());
        if (resourceType.length() == 0) {
            return detail(tenantId, id);
        }
        List<InfrastructureResourceEntity> resources = infrastructureResourceMapper.selectPage(tenantId,
                logicalObject.getSourceInfrastructureId(), "", resourceType, 0, 5000);
        long now = System.currentTimeMillis();
        for (InfrastructureResourceEntity resource : resources) {
            if (matches(logicalObject, resource)) {
                upsertInstance(tenantId, logicalObject, resource, now);
            }
        }
        return detail(tenantId, id);
    }

    private LogicalObjectEntity require(String tenantId, String id) {
        LogicalObjectEntity entity = logicalObjectMapper.selectById(tenantId, trim(id));
        if (entity == null) {
            throw new BusinessException(ErrorCode.RESOURCE_NOT_FOUND, "logical.object.not.found");
        }
        return entity;
    }

    private void fill(LogicalObjectEntity entity, LogicalObjectSaveRequest request) {
        String objectType = upper(request.getObjectType());
        String sourceType = upper(request.getSourceType());
        String matchType = upper(defaultText(request.getMatchType(), "REGEX"));
        if (!OBJECT_TYPES.contains(objectType)) {
            throw new BusinessException(ErrorCode.VALIDATION_FAILED, "logical.object.type.invalid");
        }
        if (!SOURCE_TYPES.contains(sourceType)) {
            throw new BusinessException(ErrorCode.VALIDATION_FAILED, "logical.object.source.type.invalid");
        }
        if (!MATCH_TYPES.contains(matchType)) {
            throw new BusinessException(ErrorCode.VALIDATION_FAILED, "logical.object.match.type.invalid");
        }
        validatePattern(matchType, request.getMatchPattern());
        assertJson(request.getInstanceFilterJson(), "logical.object.instance.filter.invalid");
        assertJson(request.getAggregationJson(), "logical.object.aggregation.invalid");
        assertJson(request.getOutputMetricJson(), "logical.object.output.metric.invalid");
        entity.setObjectCode(trim(request.getObjectCode()));
        entity.setObjectName(trim(request.getObjectName()));
        entity.setObjectType(objectType);
        entity.setEnvId(trim(request.getEnvId()));
        entity.setRegionId(trim(request.getRegionId()));
        entity.setSourceType(sourceType);
        entity.setSourceInfrastructureId(trim(request.getSourceInfrastructureId()));
        entity.setMatchField(defaultText(trim(request.getMatchField()), "name"));
        entity.setMatchType(matchType);
        entity.setMatchPattern(trim(request.getMatchPattern()));
        entity.setTimeExtractRegex(trim(request.getTimeExtractRegex()));
        entity.setTimeFormat(trim(request.getTimeFormat()));
        entity.setTimeReference(upper(defaultText(request.getTimeReference(), "NONE")));
        entity.setInstanceFilterJson(defaultText(trim(request.getInstanceFilterJson()), "{}"));
        entity.setAggregationJson(defaultText(trim(request.getAggregationJson()), "{}"));
        entity.setOutputMetricJson(defaultText(trim(request.getOutputMetricJson()), "[]"));
        entity.setEnabled(request.getEnabled() == null || request.getEnabled());
        entity.setDescription(trim(request.getDescription()));
    }

    private void validatePattern(String matchType, String matchPattern) {
        if ("REGEX".equals(matchType) && trim(matchPattern).length() > 0) {
            try {
                Pattern.compile(matchPattern);
            } catch (PatternSyntaxException exception) {
                throw new BusinessException(ErrorCode.VALIDATION_FAILED, "logical.object.match.pattern.invalid");
            }
        }
    }

    private String physicalResourceType(String objectType) {
        if ("SPARK_LOGICAL_JOB".equals(objectType)) {
            return "SPARK_APPLICATION";
        }
        if ("KAFKA_LOGICAL_CONSUMER_GROUP".equals(objectType)) {
            return "KAFKA_CONSUMER_GROUP";
        }
        if ("APPLICATION_LOGICAL_SERVICE".equals(objectType)) {
            return "APPLICATION_INSTANCE";
        }
        return "";
    }

    private boolean matches(LogicalObjectEntity logicalObject, InfrastructureResourceEntity resource) {
        String field = defaultText(logicalObject.getMatchField(), "name").toLowerCase(Locale.ROOT);
        String value = "code".equals(field) || "id".equals(field) || "groupid".equals(field)
                ? resource.getResourceCode() : resource.getResourceName();
        String pattern = trim(logicalObject.getMatchPattern());
        if (pattern.length() == 0) {
            return true;
        }
        if ("EXACT".equals(logicalObject.getMatchType())) {
            return pattern.equals(value);
        }
        if ("PREFIX".equals(logicalObject.getMatchType())) {
            return value != null && value.startsWith(pattern);
        }
        if ("REGEX".equals(logicalObject.getMatchType())) {
            return value != null && Pattern.compile(pattern).matcher(value).matches();
        }
        if ("EXPRESSION".equals(logicalObject.getMatchType())) {
            return expressionMatches(pattern, value, resource);
        }
        return false;
    }

    private boolean expressionMatches(String expression, String value, InfrastructureResourceEntity resource) {
        String expr = trim(expression);
        if (expr.startsWith("startsWith(") && expr.endsWith(")")) {
            return value != null && value.startsWith(unquote(expr.substring(11, expr.length() - 1)));
        }
        if (expr.startsWith("contains(") && expr.endsWith(")")) {
            return value != null && value.contains(unquote(expr.substring(9, expr.length() - 1)));
        }
        if ("status.active".equals(expr)) {
            String status = upper(resource.getStatus());
            return "RUNNING".equals(status) || "ACTIVE".equals(status) || "ALIVE".equals(status);
        }
        return false;
    }

    private String unquote(String value) {
        String text = trim(value);
        if ((text.startsWith("'") && text.endsWith("'")) || (text.startsWith("\"") && text.endsWith("\""))) {
            return text.substring(1, text.length() - 1);
        }
        return text;
    }

    private void upsertInstance(String tenantId, LogicalObjectEntity logicalObject, InfrastructureResourceEntity resource, long now) {
        LogicalObjectInstanceEntity entity = instanceMapper.selectByPhysicalKey(tenantId, logicalObject.getId(), resource.getResourceType(), resource.getResourceCode());
        boolean newInstance = entity == null;
        if (newInstance) {
            entity = new LogicalObjectInstanceEntity();
            entity.setId(IdGenerator.nextId());
            entity.setTenantId(tenantId);
            entity.setLogicalObjectId(logicalObject.getId());
            entity.setPhysicalObjectType(resource.getResourceType());
            entity.setPhysicalObjectCode(resource.getResourceCode());
            entity.setFirstSeenAt(now);
            entity.setCreatedAt(now);
        }
        entity.setPhysicalObjectId(resource.getId());
        entity.setPhysicalObjectName(resource.getResourceName());
        entity.setStatus(resource.getStatus());
        entity.setMetricJson("{}");
        entity.setLastSeenAt(now);
        entity.setMetadataJson(resource.getMetadataJson());
        entity.setUpdatedAt(now);
        if (entity.getCreatedAt() == null) {
            entity.setCreatedAt(now);
        }
        if (newInstance) {
            instanceMapper.insert(entity);
        } else {
            instanceMapper.update(entity);
        }
    }

    private void assertJson(String value, String messageKey) {
        if (trim(value).length() == 0) {
            return;
        }
        try {
            OBJECT_MAPPER.readTree(value);
        } catch (Exception exception) {
            throw new BusinessException(ErrorCode.VALIDATION_FAILED, messageKey);
        }
    }

    private LogicalObjectResponse toResponse(LogicalObjectEntity entity) {
        LogicalObjectResponse response = new LogicalObjectResponse();
        response.setId(entity.getId());
        response.setObjectCode(entity.getObjectCode());
        response.setObjectName(entity.getObjectName());
        response.setObjectType(entity.getObjectType());
        response.setEnvId(entity.getEnvId());
        response.setRegionId(entity.getRegionId());
        response.setSourceType(entity.getSourceType());
        response.setSourceInfrastructureId(entity.getSourceInfrastructureId());
        response.setMatchField(entity.getMatchField());
        response.setMatchType(entity.getMatchType());
        response.setMatchPattern(entity.getMatchPattern());
        response.setTimeExtractRegex(entity.getTimeExtractRegex());
        response.setTimeFormat(entity.getTimeFormat());
        response.setTimeReference(entity.getTimeReference());
        response.setInstanceFilterJson(entity.getInstanceFilterJson());
        response.setAggregationJson(entity.getAggregationJson());
        response.setOutputMetricJson(entity.getOutputMetricJson());
        response.setEnabled(entity.getEnabled());
        response.setDescription(entity.getDescription());
        response.setInstanceCount(defaultLong(entity.getInstanceCount()));
        response.setActiveInstanceCount(defaultLong(entity.getActiveInstanceCount()));
        response.setLastSeenAt(entity.getLastSeenAt());
        response.setCreatedAt(entity.getCreatedAt());
        response.setUpdatedAt(entity.getUpdatedAt());
        return response;
    }

    private LogicalObjectInstanceResponse toInstanceResponse(LogicalObjectInstanceEntity entity) {
        LogicalObjectInstanceResponse response = new LogicalObjectInstanceResponse();
        response.setId(entity.getId());
        response.setLogicalObjectId(entity.getLogicalObjectId());
        response.setPhysicalObjectType(entity.getPhysicalObjectType());
        response.setPhysicalObjectId(entity.getPhysicalObjectId());
        response.setPhysicalObjectCode(entity.getPhysicalObjectCode());
        response.setPhysicalObjectName(entity.getPhysicalObjectName());
        response.setStatus(entity.getStatus());
        response.setMetricJson(entity.getMetricJson());
        response.setFirstSeenAt(entity.getFirstSeenAt());
        response.setLastSeenAt(entity.getLastSeenAt());
        response.setMetadataJson(entity.getMetadataJson());
        return response;
    }

    private int positive(Integer value, int fallback) {
        return value == null || value <= 0 ? fallback : value;
    }

    private int bounded(Integer value, int fallback, int max) {
        int actual = positive(value, fallback);
        return actual > max ? max : actual;
    }

    private String trim(String value) {
        return value == null ? "" : value.trim();
    }

    private String upper(String value) {
        String text = trim(value);
        return text.length() == 0 ? "" : text.toUpperCase(Locale.ROOT);
    }

    private String defaultText(String value, String fallback) {
        String text = trim(value);
        return text.length() == 0 ? fallback : text;
    }

    private Long defaultLong(Long value) {
        return value == null ? 0L : value;
    }
}
