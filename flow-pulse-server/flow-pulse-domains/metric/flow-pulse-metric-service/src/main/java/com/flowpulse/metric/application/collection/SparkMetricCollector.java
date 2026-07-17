package com.flowpulse.metric.application.collection;

import com.flowpulse.infrastructure.infrastructure.persistence.mapper.InfrastructureMapper;
import com.flowpulse.infrastructure.infrastructure.persistence.mapper.InfrastructureResourceMapper;
import com.flowpulse.metric.infrastructure.persistence.mapper.MetricSampleMapper;
import com.flowpulse.topology.infrastructure.persistence.mapper.TopologyEdgeMapper;
import com.flowpulse.topology.infrastructure.persistence.mapper.TopologyNodeMapper;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

@Component @Order(110)
public class SparkMetricCollector extends TechnologyBuiltInMetricCollector {
    public SparkMetricCollector(InfrastructureMapper i, InfrastructureResourceMapper r, TopologyNodeMapper n,
                                TopologyEdgeMapper e, MetricSampleMapper s, JsonMetricValueReader v) {
        super("SPARK_", i, r, n, e, s, v);
    }
}
