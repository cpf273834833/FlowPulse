package com.flowpulse.metric.application.collection;

import com.flowpulse.infrastructure.infrastructure.persistence.mapper.InfrastructureMapper;
import com.flowpulse.infrastructure.infrastructure.persistence.mapper.InfrastructureResourceMapper;
import com.flowpulse.metric.infrastructure.persistence.mapper.MetricSampleMapper;
import com.flowpulse.topology.infrastructure.persistence.mapper.TopologyEdgeMapper;
import com.flowpulse.topology.infrastructure.persistence.mapper.TopologyNodeMapper;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

@Component @Order(120)
public class ElasticsearchMetricCollector extends TechnologyBuiltInMetricCollector {
    public ElasticsearchMetricCollector(InfrastructureMapper i, InfrastructureResourceMapper r, TopologyNodeMapper n,
                                        TopologyEdgeMapper e, MetricSampleMapper s, JsonMetricValueReader v) {
        super("ES_", i, r, n, e, s, v);
    }
}
