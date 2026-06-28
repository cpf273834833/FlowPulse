package com.flowpulse.metric.application;

import com.flowpulse.common.BusinessException;
import com.flowpulse.common.ErrorCode;
import com.flowpulse.common.IdGenerator;
import com.flowpulse.common.StatCard;
import com.flowpulse.metric.api.request.MetricImplementationQueryRequest;
import com.flowpulse.metric.api.request.MetricImplementationSaveRequest;
import com.flowpulse.metric.api.response.MetricImplementationPageResponse;
import com.flowpulse.metric.api.response.MetricImplementationResponse;
import com.flowpulse.metric.api.response.PageResponse;
import com.flowpulse.metric.domain.model.MetricDefinitionEntity;
import com.flowpulse.metric.domain.model.MetricImplementationEntity;
import com.flowpulse.metric.infrastructure.persistence.mapper.MetricDefinitionMapper;
import com.flowpulse.metric.infrastructure.persistence.mapper.MetricImplementationMapper;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;

@Service
public class MetricImplementationService {
    private static final Set<String> TYPES = new HashSet<String>(Arrays.asList("BUILT_IN", "SHELL", "PYTHON", "EXPRESSION"));
    private static final Set<String> MODES = new HashSet<String>(Arrays.asList("SERVER", "SSH", "AGENT", "EXPRESSION"));

    private final MetricDefinitionMapper metricDefinitionMapper;
    private final MetricImplementationMapper metricImplementationMapper;

    public MetricImplementationService(MetricDefinitionMapper metricDefinitionMapper,
                                       MetricImplementationMapper metricImplementationMapper) {
        this.metricDefinitionMapper = metricDefinitionMapper;
        this.metricImplementationMapper = metricImplementationMapper;
    }

    public MetricImplementationPageResponse page(String tenantId, MetricImplementationQueryRequest request) {
        MetricImplementationQueryRequest query = request == null ? new MetricImplementationQueryRequest() : request;
        int pageNo = positive(query.getPageNo(), 1);
        int pageSize = bounded(query.getPageSize(), 10, 100);
        Boolean enabled = parseEnabled(query.getEnabled());
        List<MetricImplementationEntity> rows = metricImplementationMapper.selectPage(
                tenantId, trim(query.getKeyword()), trim(query.getMetricDefinitionId()),
                upper(query.getImplementationType()), enabled, (pageNo - 1) * pageSize, pageSize);
        long total = metricImplementationMapper.countPage(
                tenantId, trim(query.getKeyword()), trim(query.getMetricDefinitionId()),
                upper(query.getImplementationType()), enabled);

        PageResponse<MetricImplementationResponse> page = new PageResponse<MetricImplementationResponse>();
        page.setRecords(toResponses(rows));
        page.setTotal(total);
        page.setPageNo(pageNo);
        page.setPageSize(pageSize);

        MetricImplementationPageResponse response = new MetricImplementationPageResponse();
        response.setImplementations(page);
        response.setStats(buildStats(tenantId));
        return response;
    }

    public MetricImplementationResponse detail(String tenantId, String id) {
        return toResponse(require(tenantId, id));
    }

    @Transactional
    public MetricImplementationResponse create(String tenantId, MetricImplementationSaveRequest request) {
        assertCodeUnique(tenantId, null, request.getImplementationCode());
        long now = System.currentTimeMillis();
        MetricImplementationEntity entity = new MetricImplementationEntity();
        entity.setId(IdGenerator.nextId());
        entity.setTenantId(tenantId);
        fill(tenantId, entity, request);
        entity.setCreatedAt(Long.valueOf(now));
        entity.setUpdatedAt(Long.valueOf(now));
        if (Boolean.TRUE.equals(entity.getDefaultImplementation())) {
            metricImplementationMapper.clearDefault(tenantId, entity.getMetricDefinitionId(), entity.getId());
        }
        metricImplementationMapper.insert(entity);
        return detail(tenantId, entity.getId());
    }

    @Transactional
    public MetricImplementationResponse update(String tenantId, String id, MetricImplementationSaveRequest request) {
        MetricImplementationEntity entity = require(tenantId, id);
        assertCodeUnique(tenantId, id, request.getImplementationCode());
        fill(tenantId, entity, request);
        entity.setUpdatedAt(Long.valueOf(System.currentTimeMillis()));
        if (Boolean.TRUE.equals(entity.getDefaultImplementation())) {
            metricImplementationMapper.clearDefault(tenantId, entity.getMetricDefinitionId(), entity.getId());
        }
        metricImplementationMapper.update(entity);
        return detail(tenantId, id);
    }

    @Transactional
    public void delete(String tenantId, String id) {
        require(tenantId, id);
        metricImplementationMapper.deleteById(tenantId, id);
    }

    private void fill(String tenantId, MetricImplementationEntity entity, MetricImplementationSaveRequest request) {
        MetricDefinitionEntity definition = metricDefinitionMapper.selectById(tenantId, request.getMetricDefinitionId());
        if (definition == null) {
            throw new BusinessException(ErrorCode.RESOURCE_NOT_FOUND, "metric.not.found");
        }
        String type = normalize(request.getImplementationType(), TYPES, "metric.implementation.type.invalid");
        String mode = normalize(defaultIfBlank(request.getExecutionMode(), defaultMode(type)), MODES, "metric.execution.mode.invalid");
        entity.setMetricDefinitionId(definition.getId());
        entity.setImplementationCode(trim(request.getImplementationCode()));
        entity.setImplementationName(trim(request.getImplementationName()));
        entity.setImplementationType(type);
        entity.setExecutionMode(mode);
        entity.setScriptLanguage(trim(request.getScriptLanguage()));
        entity.setScriptContent(trim(request.getScriptContent()));
        entity.setConfigJson(trim(request.getConfigJson()));
        entity.setParameterSchemaJson(trim(request.getParameterSchemaJson()));
        entity.setOutputSchemaJson(trim(request.getOutputSchemaJson()));
        entity.setBuiltInCollector(trim(request.getBuiltInCollector()));
        entity.setDefaultImplementation(request.getDefaultImplementation() == null ? Boolean.FALSE : request.getDefaultImplementation());
        entity.setEnabled(request.getEnabled() == null ? Boolean.TRUE : request.getEnabled());
        entity.setTimeoutSec(request.getTimeoutSec() == null ? Integer.valueOf(30) : request.getTimeoutSec());
        entity.setDescription(trim(request.getDescription()));
    }

    private String defaultMode(String type) {
        if ("SHELL".equals(type) || "PYTHON".equals(type)) {
            return "SSH";
        }
        if ("EXPRESSION".equals(type)) {
            return "EXPRESSION";
        }
        return "SERVER";
    }

    private MetricImplementationEntity require(String tenantId, String id) {
        MetricImplementationEntity entity = metricImplementationMapper.selectById(tenantId, id);
        if (entity == null) {
            throw new BusinessException(ErrorCode.RESOURCE_NOT_FOUND, "metric.implementation.not.found");
        }
        return entity;
    }

    private void assertCodeUnique(String tenantId, String currentId, String code) {
        MetricImplementationEntity entity = metricImplementationMapper.selectByCode(tenantId, trim(code));
        if (entity != null && !entity.getId().equals(currentId)) {
            throw new BusinessException(ErrorCode.CONFLICT, "metric.implementation.code.exists");
        }
    }

    private List<MetricImplementationResponse> toResponses(List<MetricImplementationEntity> rows) {
        List<MetricImplementationResponse> responses = new ArrayList<MetricImplementationResponse>();
        for (MetricImplementationEntity row : rows) {
            responses.add(toResponse(row));
        }
        return responses;
    }

    private MetricImplementationResponse toResponse(MetricImplementationEntity entity) {
        MetricImplementationResponse response = new MetricImplementationResponse();
        response.setId(entity.getId());
        response.setMetricDefinitionId(entity.getMetricDefinitionId());
        response.setMetricCode(entity.getMetricCode());
        response.setMetricName(entity.getMetricName());
        response.setImplementationCode(entity.getImplementationCode());
        response.setImplementationName(entity.getImplementationName());
        response.setImplementationType(entity.getImplementationType());
        response.setExecutionMode(entity.getExecutionMode());
        response.setScriptLanguage(entity.getScriptLanguage());
        response.setScriptContent(entity.getScriptContent());
        response.setConfigJson(entity.getConfigJson());
        response.setParameterSchemaJson(entity.getParameterSchemaJson());
        response.setOutputSchemaJson(entity.getOutputSchemaJson());
        response.setBuiltInCollector(entity.getBuiltInCollector());
        response.setDefaultImplementation(entity.getDefaultImplementation());
        response.setEnabled(entity.getEnabled());
        response.setTimeoutSec(entity.getTimeoutSec());
        response.setDescription(entity.getDescription());
        response.setCreatedAt(entity.getCreatedAt());
        response.setUpdatedAt(entity.getUpdatedAt());
        return response;
    }

    private List<StatCard> buildStats(String tenantId) {
        List<StatCard> stats = new ArrayList<StatCard>();
        stats.add(new StatCard("采集实现", String.valueOf(metricImplementationMapper.countAll(tenantId)), "指标可用的采集方式"));
        stats.add(new StatCard("启用实现", String.valueOf(metricImplementationMapper.countEnabled(tenantId)), "可被资源选择"));
        stats.add(new StatCard("默认实现", String.valueOf(metricImplementationMapper.countDefault(tenantId)), "指标默认采集方式"));
        stats.add(new StatCard("脚本实现", String.valueOf(metricImplementationMapper.countScript(tenantId)), "Shell / Python"));
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

    private String defaultIfBlank(String value, String defaultValue) {
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
