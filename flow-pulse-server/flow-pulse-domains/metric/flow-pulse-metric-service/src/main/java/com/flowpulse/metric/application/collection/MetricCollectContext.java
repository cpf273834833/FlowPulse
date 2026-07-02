package com.flowpulse.metric.application.collection;

import com.flowpulse.metric.domain.model.MetricImplementationEntity;
import com.flowpulse.metric.domain.model.ResourceMetricConfigEntity;

public class MetricCollectContext {
    private final ResourceMetricConfigEntity config;
    private final MetricImplementationEntity implementation;
    private final String resolvedParameterJson;

    public MetricCollectContext(ResourceMetricConfigEntity config, MetricImplementationEntity implementation, String resolvedParameterJson) {
        this.config = config;
        this.implementation = implementation;
        this.resolvedParameterJson = resolvedParameterJson;
    }

    public ResourceMetricConfigEntity getConfig() {
        return config;
    }

    public MetricImplementationEntity getImplementation() {
        return implementation;
    }

    public String getResolvedParameterJson() {
        return resolvedParameterJson;
    }
}
