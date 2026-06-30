package com.flowpulse.metric.application.collection;

import org.springframework.stereotype.Component;

import java.util.List;

@Component
public class MetricCollectorRegistry {
    private final List<MetricCollector> collectors;

    public MetricCollectorRegistry(List<MetricCollector> collectors) {
        this.collectors = collectors;
    }

    public MetricCollector require(MetricCollectContext context) {
        for (MetricCollector collector : collectors) {
            if (collector.supports(context)) {
                return collector;
            }
        }
        throw new IllegalStateException("No metric collector supports implementation type "
                + context.getImplementation().getImplementationType() + " and execution mode "
                + context.getConfig().getExecutionMode());
    }
}
