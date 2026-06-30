package com.flowpulse.metric.api.response;

import com.flowpulse.common.StatCard;

import java.util.ArrayList;
import java.util.List;

public class MetricImplementationPageResponse {
    private PageResponse<MetricImplementationResponse> implementations = new PageResponse<MetricImplementationResponse>();
    private List<StatCard> stats = new ArrayList<StatCard>();

    public PageResponse<MetricImplementationResponse> getImplementations() { return implementations; }
    public void setImplementations(PageResponse<MetricImplementationResponse> implementations) { this.implementations = implementations; }
    public List<StatCard> getStats() { return stats; }
    public void setStats(List<StatCard> stats) { this.stats = stats; }
}
