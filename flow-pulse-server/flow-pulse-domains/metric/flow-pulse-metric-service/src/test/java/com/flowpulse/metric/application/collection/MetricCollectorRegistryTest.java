package com.flowpulse.metric.application.collection;

import com.flowpulse.metric.domain.model.MetricImplementationEntity;
import com.flowpulse.metric.domain.model.ResourceMetricConfigEntity;
import org.junit.jupiter.api.Test;
import java.util.Arrays;
import static org.assertj.core.api.Assertions.assertThat;

class MetricCollectorRegistryTest {
    @Test void routesToSupportingStrategy() {
        MetricCollector expected = collector(true);
        MetricCollectContext context = new MetricCollectContext(new ResourceMetricConfigEntity(), new MetricImplementationEntity(), "{}");
        assertThat(new MetricCollectorRegistry(Arrays.asList(collector(false), expected)).require(context)).isSameAs(expected);
    }

    private MetricCollector collector(final boolean supported) {
        return new MetricCollector() {
            public boolean supports(MetricCollectContext context) { return supported; }
            public MetricCollectResult collect(MetricCollectContext context) { return null; }
        };
    }
}
