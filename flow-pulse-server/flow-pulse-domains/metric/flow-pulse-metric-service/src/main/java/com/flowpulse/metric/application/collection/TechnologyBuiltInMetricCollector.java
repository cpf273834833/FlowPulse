package com.flowpulse.metric.application.collection;

import com.flowpulse.infrastructure.infrastructure.persistence.mapper.InfrastructureMapper;
import com.flowpulse.infrastructure.infrastructure.persistence.mapper.InfrastructureResourceMapper;
import com.flowpulse.metric.infrastructure.persistence.mapper.MetricSampleMapper;
import com.flowpulse.topology.infrastructure.persistence.mapper.TopologyEdgeMapper;
import com.flowpulse.topology.infrastructure.persistence.mapper.TopologyNodeMapper;

import java.util.Locale;

/** Common wiring for one technology-specific built-in strategy. */
abstract class TechnologyBuiltInMetricCollector extends BuiltInMetricCollector {
    private final String collectorPrefix;

    TechnologyBuiltInMetricCollector(String collectorPrefix,
                                     InfrastructureMapper infrastructureMapper,
                                     InfrastructureResourceMapper resourceMapper,
                                     TopologyNodeMapper topologyNodeMapper,
                                     TopologyEdgeMapper topologyEdgeMapper,
                                     MetricSampleMapper sampleMapper,
                                     JsonMetricValueReader valueReader) {
        super(infrastructureMapper, resourceMapper, topologyNodeMapper, topologyEdgeMapper, sampleMapper, valueReader);
        this.collectorPrefix = collectorPrefix;
    }

    @Override
    public final boolean supports(MetricCollectContext context) {
        if (!"BUILT_IN".equalsIgnoreCase(context.getImplementation().getImplementationType())) return false;
        String name = context.getImplementation().getBuiltInCollector();
        if (name == null || name.trim().length() == 0) name = context.getImplementation().getMetricCode();
        return name != null && name.trim().toUpperCase(Locale.ROOT).startsWith(collectorPrefix);
    }
}
