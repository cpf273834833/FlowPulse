package com.flowpulse.metric.api.response;

import com.flowpulse.common.StatCard;

import java.util.ArrayList;
import java.util.List;

public class ResourceMetricConfigPageResponse {
    private PageResponse<ResourceMetricConfigResponse> configs = new PageResponse<ResourceMetricConfigResponse>();
    private List<StatCard> stats = new ArrayList<StatCard>();

    public PageResponse<ResourceMetricConfigResponse> getConfigs() { return configs; }
    public void setConfigs(PageResponse<ResourceMetricConfigResponse> configs) { this.configs = configs; }
    public List<StatCard> getStats() { return stats; }
    public void setStats(List<StatCard> stats) { this.stats = stats; }
}
