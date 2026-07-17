package com.flowpulse.metric.application.collection;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.flowpulse.infrastructure.infrastructure.persistence.mapper.InfrastructureMapper;
import com.flowpulse.infrastructure.infrastructure.persistence.mapper.InfrastructureResourceMapper;
import com.flowpulse.metric.domain.model.ResourceMetricConfigEntity;
import com.flowpulse.topology.infrastructure.persistence.mapper.TopologyEdgeMapper;
import com.flowpulse.topology.infrastructure.persistence.mapper.TopologyNodeMapper;
import org.springframework.stereotype.Component;

/** Application-facing facade for parameter-template resolution. */
@Component
public class MetricParameterTemplateResolver {
    private final MetricParameterResolutionEngine engine;

    public MetricParameterTemplateResolver(ObjectMapper objectMapper,
                                           InfrastructureMapper infrastructureMapper,
                                           InfrastructureResourceMapper resourceMapper,
                                           TopologyNodeMapper topologyNodeMapper,
                                           TopologyEdgeMapper topologyEdgeMapper,
                                           MetricParameterValueTransformer valueTransformer) {
        this.engine = new MetricParameterResolutionEngine(objectMapper, infrastructureMapper,
                resourceMapper, topologyNodeMapper, topologyEdgeMapper, valueTransformer);
    }

    public String resolve(ResourceMetricConfigEntity config) {
        return engine.resolve(config);
    }
}
