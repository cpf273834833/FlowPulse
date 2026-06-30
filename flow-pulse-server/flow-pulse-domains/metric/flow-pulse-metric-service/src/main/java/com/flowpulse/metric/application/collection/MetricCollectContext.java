package com.flowpulse.metric.application.collection;

import com.flowpulse.metric.domain.model.MetricImplementationEntity;
import com.flowpulse.metric.domain.model.ResourceMetricConfigEntity;

public class MetricCollectContext {
    private final ResourceMetricConfigEntity config;
    private final MetricImplementationEntity implementation;

    public MetricCollectContext(ResourceMetricConfigEntity config, MetricImplementationEntity implementation) {
        this.config = config;
        this.implementation = implementation;
    }

    public ResourceMetricConfigEntity getConfig() {
        return config;
    }

    public MetricImplementationEntity getImplementation() {
        return implementation;
    }
}
