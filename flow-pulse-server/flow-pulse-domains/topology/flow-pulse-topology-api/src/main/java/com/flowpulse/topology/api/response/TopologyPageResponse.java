package com.flowpulse.topology.api.response;

import com.flowpulse.common.StatCard;

import java.util.List;

public class TopologyPageResponse {
    private PageResponse<TopologyResponse> topologies;
    private List<StatCard> stats;

    public PageResponse<TopologyResponse> getTopologies() { return topologies; }
    public void setTopologies(PageResponse<TopologyResponse> topologies) { this.topologies = topologies; }
    public List<StatCard> getStats() { return stats; }
    public void setStats(List<StatCard> stats) { this.stats = stats; }
}
