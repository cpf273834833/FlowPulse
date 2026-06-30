package com.flowpulse.metric.application.collection;

import org.springframework.stereotype.Component;

@Component
public class AgentMetricCollector implements MetricCollector {
    @Override
    public boolean supports(MetricCollectContext context) {
        return "AGENT".equalsIgnoreCase(context.getConfig().getExecutionMode());
    }

    @Override
    public MetricCollectResult collect(MetricCollectContext context) {
        throw new IllegalStateException("Agent collection channel is not connected.");
    }
}
