package com.flowpulse.metric.application.collection;

import org.junit.jupiter.api.Test;
import static org.assertj.core.api.Assertions.assertThat;

class MetricParameterValueTransformerTest {
    private final MetricParameterValueTransformer transformer = new MetricParameterValueTransformer();

    @Test void transformsValues() {
        assertThat(transformer.transform("node-42", "REGEX_EXTRACT", null, null, null, null,
                "node-(\\d+)", 1)).isEqualTo("42");
        assertThat(transformer.transform("42", "CONCAT", null, null, "[", "]", null, 0)).isEqualTo("[42]");
    }

    @Test void evaluatesOperators() {
        assertThat(transformer.matches("12", ">", "10")).isTrue();
        assertThat(transformer.matches("flowpulse", "STARTS_WITH", "flow")).isTrue();
        assertThat(transformer.matches("offline", "==", "online")).isFalse();
    }
}
