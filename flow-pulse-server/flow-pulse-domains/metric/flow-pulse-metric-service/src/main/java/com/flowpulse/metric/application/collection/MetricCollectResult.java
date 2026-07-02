package com.flowpulse.metric.application.collection;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

public class MetricCollectResult {
    private static final String TOTAL_INSTANCE = "__TOTAL__";

    private final double value;
    private final String message;
    private final String metadataJson;
    private final List<MetricSeriesPoint> seriesPoints;

    private MetricCollectResult(double value, String message, String metadataJson, List<MetricSeriesPoint> seriesPoints) {
        this.value = value;
        this.message = message;
        this.metadataJson = metadataJson;
        this.seriesPoints = seriesPoints == null
                ? Collections.<MetricSeriesPoint>emptyList()
                : Collections.unmodifiableList(new ArrayList<MetricSeriesPoint>(seriesPoints));
    }

    public static MetricCollectResult success(double value, String message, String metadataJson) {
        List<MetricSeriesPoint> points = new ArrayList<MetricSeriesPoint>();
        points.add(MetricSeriesPoint.aggregate(TOTAL_INSTANCE, value, metadataJson));
        return new MetricCollectResult(value, message, metadataJson, points);
    }

    public static MetricCollectResult success(List<MetricSeriesPoint> points, String message, String metadataJson) {
        if (points == null || points.isEmpty()) {
            throw new IllegalArgumentException("Metric collection produced no series point.");
        }
        return new MetricCollectResult(resolvePrimaryValue(points), message, metadataJson, points);
    }

    private static double resolvePrimaryValue(List<MetricSeriesPoint> points) {
        for (MetricSeriesPoint point : points) {
            if (TOTAL_INSTANCE.equals(point.getInstance()) && "AGGREGATE".equals(point.getSeriesType())) {
                return point.getValue();
            }
        }
        return points.get(0).getValue();
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

    public List<MetricSeriesPoint> getSeriesPoints() {
        return seriesPoints;
    }
}
