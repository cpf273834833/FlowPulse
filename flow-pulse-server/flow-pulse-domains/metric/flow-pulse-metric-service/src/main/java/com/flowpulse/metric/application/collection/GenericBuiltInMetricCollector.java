package com.flowpulse.metric.application.collection;

import com.flowpulse.infrastructure.domain.model.InfrastructureEntity;
import com.flowpulse.infrastructure.domain.model.InfrastructureResourceEntity;
import com.flowpulse.infrastructure.infrastructure.persistence.mapper.InfrastructureMapper;
import com.flowpulse.infrastructure.infrastructure.persistence.mapper.InfrastructureResourceMapper;
import com.flowpulse.metric.domain.model.MetricImplementationEntity;
import com.flowpulse.metric.domain.model.ResourceMetricConfigEntity;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

import java.util.Locale;

/** Handles generic built-in metrics that do not require a technology client. */
@Order(200)
@Component
public class GenericBuiltInMetricCollector implements MetricCollector {
    private final InfrastructureMapper infrastructureMapper;
    private final InfrastructureResourceMapper resourceMapper;
    private final JsonMetricValueReader valueReader;

    public GenericBuiltInMetricCollector(InfrastructureMapper infrastructureMapper,
                                         InfrastructureResourceMapper resourceMapper,
                                         JsonMetricValueReader valueReader) {
        this.infrastructureMapper = infrastructureMapper;
        this.resourceMapper = resourceMapper;
        this.valueReader = valueReader;
    }

    @Override
    public boolean supports(MetricCollectContext context) {
        if (!"BUILT_IN".equalsIgnoreCase(context.getImplementation().getImplementationType())) {
            return false;
        }
        String collector = collectorName(context.getImplementation());
        return "CONSTANT".equals(collector) || "STATIC_VALUE".equals(collector)
                || collector.contains("RESOURCE_COUNT") || collector.contains("SYNC_DELAY")
                || collector.contains("SYNC_LAG") || collector.contains("CONNECTION")
                || collector.contains("AVAILABLE") || collector.contains("STATUS")
                || (context.getConfig().getObjectType() != null
                    && context.getConfig().getObjectType().endsWith("_RESOURCE"));
    }

    @Override
    public MetricCollectResult collect(MetricCollectContext context) {
        String collector = collectorName(context.getImplementation());
        if ("CONSTANT".equals(collector) || "STATIC_VALUE".equals(collector)) {
            double value = valueReader.readValue(firstNotBlank(
                    valueReader.readStringField(context.getResolvedParameterJson(), "value"), "", "0"));
            return MetricCollectResult.success(value, "Built-in constant metric collected.", "{\"source\":\"BUILT_IN\"}");
        }
        if (collector.contains("RESOURCE_COUNT")) return collectResourceCount(context.getConfig());
        if (collector.contains("SYNC_DELAY") || collector.contains("SYNC_LAG")) return collectSyncDelay(context.getConfig());
        if (collector.contains("CONNECTION") || collector.contains("AVAILABLE") || collector.contains("STATUS")) {
            return collectConnectionStatus(context.getConfig());
        }
        return collectResourceStatus(context.getConfig());
    }

    private MetricCollectResult collectResourceCount(ResourceMetricConfigEntity config) {
        int count = resourceMapper.countByInfrastructureId(config.getTenantId(), resolveInfrastructureId(config));
        return MetricCollectResult.success(count, "Infrastructure resource count collected.", "{\"source\":\"BUILT_IN\"}");
    }

    private MetricCollectResult collectSyncDelay(ResourceMetricConfigEntity config) {
        InfrastructureEntity infrastructure = requireInfrastructure(config);
        Long lastSyncAt = infrastructure.getLastSyncAt();
        double value = lastSyncAt == null ? -1D : Math.max(0D, (System.currentTimeMillis() - lastSyncAt.longValue()) / 1000D);
        return MetricCollectResult.success(value, "Infrastructure sync delay collected.", "{\"source\":\"BUILT_IN\"}");
    }

    private MetricCollectResult collectConnectionStatus(ResourceMetricConfigEntity config) {
        double value = "NORMAL".equalsIgnoreCase(requireInfrastructure(config).getConnectionStatus()) ? 1D : 0D;
        return MetricCollectResult.success(value, "Infrastructure connection status collected.", "{\"source\":\"BUILT_IN\"}");
    }

    private MetricCollectResult collectResourceStatus(ResourceMetricConfigEntity config) {
        InfrastructureResourceEntity resource = resourceMapper.selectById(config.getTenantId(), config.getObjectId());
        if (resource == null) throw new IllegalStateException("Infrastructure resource does not exist.");
        String status = resource.getStatus() == null ? "" : resource.getStatus();
        double value = ("ACTIVE".equalsIgnoreCase(status) || "OPEN".equalsIgnoreCase(status)
                || "GREEN".equalsIgnoreCase(status) || "YELLOW".equalsIgnoreCase(status)) ? 1D : 0D;
        return MetricCollectResult.success(value, "Infrastructure resource status collected.", "{\"source\":\"BUILT_IN\"}");
    }

    private InfrastructureEntity requireInfrastructure(ResourceMetricConfigEntity config) {
        InfrastructureEntity infrastructure = infrastructureMapper.selectById(config.getTenantId(), resolveInfrastructureId(config));
        if (infrastructure == null) throw new IllegalStateException("Infrastructure does not exist.");
        return infrastructure;
    }

    private String resolveInfrastructureId(ResourceMetricConfigEntity config) {
        if (isInfrastructureObjectType(config.getObjectType())) return config.getObjectId();
        InfrastructureResourceEntity resource = resourceMapper.selectById(config.getTenantId(), config.getObjectId());
        if (resource == null) throw new IllegalStateException("Infrastructure resource does not exist.");
        return resource.getInfrastructureId();
    }

    private boolean isInfrastructureObjectType(String objectType) {
        return "INFRASTRUCTURE".equalsIgnoreCase(objectType)
                || "KAFKA".equalsIgnoreCase(objectType)
                || "SPARK".equalsIgnoreCase(objectType)
                || "ELASTICSEARCH".equalsIgnoreCase(objectType);
    }

    private String collectorName(MetricImplementationEntity implementation) {
        return firstNotBlank(implementation.getBuiltInCollector(), implementation.getMetricCode(), "")
                .trim().toUpperCase(Locale.ROOT);
    }

    private String firstNotBlank(String first, String second, String third) {
        if (first != null && first.trim().length() > 0) return first.trim();
        if (second != null && second.trim().length() > 0) return second.trim();
        return third == null ? "" : third.trim();
    }
}
