package com.flowpulse.metric.application.collection;

import com.flowpulse.infrastructure.domain.model.InfrastructureEntity;
import com.flowpulse.infrastructure.domain.model.InfrastructureResourceEntity;
import com.flowpulse.infrastructure.infrastructure.persistence.mapper.InfrastructureMapper;
import com.flowpulse.infrastructure.infrastructure.persistence.mapper.InfrastructureResourceMapper;
import com.flowpulse.metric.domain.model.MetricImplementationEntity;
import com.flowpulse.metric.domain.model.ResourceMetricConfigEntity;
import org.springframework.stereotype.Component;

import java.util.Locale;

@Component
public class BuiltInMetricCollector implements MetricCollector {
    private final InfrastructureMapper infrastructureMapper;
    private final InfrastructureResourceMapper resourceMapper;
    private final JsonMetricValueReader valueReader;

    public BuiltInMetricCollector(InfrastructureMapper infrastructureMapper,
                                  InfrastructureResourceMapper resourceMapper,
                                  JsonMetricValueReader valueReader) {
        this.infrastructureMapper = infrastructureMapper;
        this.resourceMapper = resourceMapper;
        this.valueReader = valueReader;
    }

    @Override
    public boolean supports(MetricCollectContext context) {
        return "BUILT_IN".equalsIgnoreCase(context.getImplementation().getImplementationType());
    }

    @Override
    public MetricCollectResult collect(MetricCollectContext context) {
        ResourceMetricConfigEntity config = context.getConfig();
        MetricImplementationEntity implementation = context.getImplementation();
        String collector = normalize(firstNotBlank(implementation.getBuiltInCollector(),
                valueReader.readStringField(implementation.getConfigJson(), "collector"),
                implementation.getMetricCode()));

        if ("CONSTANT".equals(collector) || "STATIC_VALUE".equals(collector)) {
            double value = valueReader.readValue(firstNotBlank(
                    valueReader.readStringField(config.getParameterJson(), "value"),
                    valueReader.readStringField(implementation.getConfigJson(), "value"),
                    "0"));
            return MetricCollectResult.success(value, "Built-in constant metric collected.", "{\"source\":\"BUILT_IN\"}");
        }
        if (collector.contains("RESOURCE_COUNT")) {
            return collectResourceCount(config);
        }
        if (collector.contains("SYNC_DELAY") || collector.contains("SYNC_LAG")) {
            return collectSyncDelay(config);
        }
        if (collector.contains("CONNECTION") || collector.contains("AVAILABLE") || collector.contains("STATUS")) {
            return collectConnectionStatus(config);
        }
        if (config.getObjectType() != null && config.getObjectType().endsWith("_RESOURCE")) {
            return collectResourceStatus(config);
        }
        return collectConnectionStatus(config);
    }

    private MetricCollectResult collectResourceCount(ResourceMetricConfigEntity config) {
        String infrastructureId = resolveInfrastructureId(config);
        int count = resourceMapper.countByInfrastructureId(config.getTenantId(), infrastructureId);
        return MetricCollectResult.success(count, "Infrastructure resource count collected.", "{\"source\":\"BUILT_IN\"}");
    }

    private MetricCollectResult collectSyncDelay(ResourceMetricConfigEntity config) {
        InfrastructureEntity infrastructure = requireInfrastructure(config);
        Long lastSyncAt = infrastructure.getLastSyncAt();
        double value = lastSyncAt == null ? -1D : Math.max(0D, (System.currentTimeMillis() - lastSyncAt.longValue()) / 1000D);
        return MetricCollectResult.success(value, "Infrastructure sync delay collected.", "{\"source\":\"BUILT_IN\"}");
    }

    private MetricCollectResult collectConnectionStatus(ResourceMetricConfigEntity config) {
        InfrastructureEntity infrastructure = requireInfrastructure(config);
        double value = "NORMAL".equalsIgnoreCase(infrastructure.getConnectionStatus()) ? 1D : 0D;
        return MetricCollectResult.success(value, "Infrastructure connection status collected.", "{\"source\":\"BUILT_IN\"}");
    }

    private MetricCollectResult collectResourceStatus(ResourceMetricConfigEntity config) {
        InfrastructureResourceEntity resource = resourceMapper.selectById(config.getTenantId(), config.getObjectId());
        if (resource == null) {
            throw new IllegalStateException("Infrastructure resource does not exist.");
        }
        String status = resource.getStatus() == null ? "" : resource.getStatus();
        double value = ("ACTIVE".equalsIgnoreCase(status) || "OPEN".equalsIgnoreCase(status)
                || "GREEN".equalsIgnoreCase(status) || "YELLOW".equalsIgnoreCase(status)) ? 1D : 0D;
        return MetricCollectResult.success(value, "Infrastructure resource status collected.", "{\"source\":\"BUILT_IN\"}");
    }

    private InfrastructureEntity requireInfrastructure(ResourceMetricConfigEntity config) {
        InfrastructureEntity infrastructure = infrastructureMapper.selectById(config.getTenantId(), resolveInfrastructureId(config));
        if (infrastructure == null) {
            throw new IllegalStateException("Infrastructure does not exist.");
        }
        return infrastructure;
    }

    private String resolveInfrastructureId(ResourceMetricConfigEntity config) {
        if ("INFRASTRUCTURE".equalsIgnoreCase(config.getObjectType())) {
            return config.getObjectId();
        }
        InfrastructureResourceEntity resource = resourceMapper.selectById(config.getTenantId(), config.getObjectId());
        if (resource == null) {
            throw new IllegalStateException("Infrastructure resource does not exist.");
        }
        return resource.getInfrastructureId();
    }

    private String normalize(String value) {
        return value == null ? "" : value.trim().toUpperCase(Locale.ROOT).replace('.', '_').replace('-', '_');
    }

    private String firstNotBlank(String first, String second, String third) {
        if (notBlank(first)) {
            return first;
        }
        if (notBlank(second)) {
            return second;
        }
        return third;
    }

    private boolean notBlank(String value) {
        return value != null && value.trim().length() > 0;
    }
}
