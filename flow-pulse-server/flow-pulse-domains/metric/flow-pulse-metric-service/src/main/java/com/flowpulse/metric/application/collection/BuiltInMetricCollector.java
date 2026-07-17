package com.flowpulse.metric.application.collection;

import com.flowpulse.infrastructure.infrastructure.persistence.mapper.InfrastructureMapper;
import com.flowpulse.infrastructure.infrastructure.persistence.mapper.InfrastructureResourceMapper;
import com.flowpulse.metric.infrastructure.persistence.mapper.MetricSampleMapper;
import com.flowpulse.topology.infrastructure.persistence.mapper.TopologyEdgeMapper;
import com.flowpulse.topology.infrastructure.persistence.mapper.TopologyNodeMapper;

/**
 * Stable collector entry point. Collector selection and infrastructure-specific
 * execution are deliberately separated so new built-in families can be moved
 * out of the engine without changing the scheduler contract.
 */
public class BuiltInMetricCollector implements MetricCollector {
    private final BuiltInMetricCollectionEngine engine;

    public BuiltInMetricCollector(InfrastructureMapper infrastructureMapper,
                                  InfrastructureResourceMapper resourceMapper,
                                  TopologyNodeMapper topologyNodeMapper,
                                  TopologyEdgeMapper topologyEdgeMapper,
                                  MetricSampleMapper sampleMapper,
                                  JsonMetricValueReader valueReader) {
        this.engine = new BuiltInMetricCollectionEngine(infrastructureMapper, resourceMapper,
                topologyNodeMapper, topologyEdgeMapper, sampleMapper, valueReader);
    }

    @Override
    public boolean supports(MetricCollectContext context) {
        return engine.supports(context);
    }

    @Override
    public MetricCollectResult collect(MetricCollectContext context) throws Exception {
        return engine.collect(context);
    }
}
