package com.flowpulse.executor.api.response;

import com.flowpulse.common.StatCard;
import com.flowpulse.management.api.response.EnvironmentResponse;
import com.flowpulse.management.api.response.RegionResponse;
import java.util.List;

public class ExecutorNodePageResponse {
    private PageResponse<ExecutorNodeResponse> nodes;
    private List<EnvironmentResponse> environments;
    private List<RegionResponse> regions;
    private List<StatCard> stats;

    public PageResponse<ExecutorNodeResponse> getNodes() { return nodes; }
    public void setNodes(PageResponse<ExecutorNodeResponse> nodes) { this.nodes = nodes; }
    public List<EnvironmentResponse> getEnvironments() { return environments; }
    public void setEnvironments(List<EnvironmentResponse> environments) { this.environments = environments; }
    public List<RegionResponse> getRegions() { return regions; }
    public void setRegions(List<RegionResponse> regions) { this.regions = regions; }
    public List<StatCard> getStats() { return stats; }
    public void setStats(List<StatCard> stats) { this.stats = stats; }
}
