package com.flowpulse.metric.application.collection;

public class MetricCollectResult {
    private final double value;
    private final String message;
    private final String metadataJson;

    private MetricCollectResult(double value, String message, String metadataJson) {
        this.value = value;
        this.message = message;
        this.metadataJson = metadataJson;
    }

    public static MetricCollectResult success(double value, String message, String metadataJson) {
        return new MetricCollectResult(value, message, metadataJson);
    }

    public double getValue() {
        return value;
    }

    public String getMessage() {
        return message;
    }

    public String getMetadataJson() {
        return metadataJson;
    }
}
