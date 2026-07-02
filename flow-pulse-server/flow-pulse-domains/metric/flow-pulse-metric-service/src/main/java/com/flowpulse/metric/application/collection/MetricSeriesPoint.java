package com.flowpulse.metric.application.collection;

public class MetricSeriesPoint {
    private final String instance;
    private final String seriesType;
    private final String quality;
    private final double value;
    private final String metadataJson;

    private MetricSeriesPoint(String instance, String seriesType, String quality, double value, String metadataJson) {
        this.instance = instance;
        this.seriesType = seriesType;
        this.quality = quality;
        this.value = value;
        this.metadataJson = metadataJson;
    }

    public static MetricSeriesPoint detail(String instance, double value, String metadataJson) {
        return new MetricSeriesPoint(instance, "DETAIL", "NORMAL", value, metadataJson);
    }

    public static MetricSeriesPoint aggregate(String instance, double value, String metadataJson) {
        return new MetricSeriesPoint(instance, "AGGREGATE", "NORMAL", value, metadataJson);
    }

    public static MetricSeriesPoint of(String instance, String seriesType, String quality, double value, String metadataJson) {
        return new MetricSeriesPoint(instance, seriesType, quality, value, metadataJson);
    }

    public String getInstance() {
        return instance;
    }

    public String getSeriesType() {
        return seriesType;
    }

    public String getQuality() {
        return quality;
    }

    public double getValue() {
        return value;
    }

    public String getMetadataJson() {
        return metadataJson;
    }
}
