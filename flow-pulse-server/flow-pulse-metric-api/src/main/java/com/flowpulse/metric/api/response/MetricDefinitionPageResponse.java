package com.flowpulse.metric.api.response;

import com.flowpulse.common.StatCard;

import java.util.ArrayList;
import java.util.List;

public class MetricDefinitionPageResponse {
    private PageResponse<MetricDefinitionResponse> metrics = new PageResponse<MetricDefinitionResponse>();
    private List<StatCard> stats = new ArrayList<StatCard>();

    public PageResponse<MetricDefinitionResponse> getMetrics() { return metrics; }
    public void setMetrics(PageResponse<MetricDefinitionResponse> metrics) { this.metrics = metrics; }
    public List<StatCard> getStats() { return stats; }
    public void setStats(List<StatCard> stats) { this.stats = stats; }
}
