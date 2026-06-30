package com.flowpulse.metric.application.collection;

public interface MetricCollector {
    boolean supports(MetricCollectContext context);

    MetricCollectResult collect(MetricCollectContext context) throws Exception;
}
