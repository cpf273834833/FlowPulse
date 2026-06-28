package com.flowpulse.infrastructure.api.response;

import com.flowpulse.common.StatCard;

import java.util.ArrayList;
import java.util.List;

public class InfrastructurePageResponse {
    private List<StatCard> stats = new ArrayList<StatCard>();
    private PageResponse<InfrastructureResponse> infrastructures;
    private List<EnvironmentOptionResponse> environments = new ArrayList<EnvironmentOptionResponse>();
    private List<RegionOptionResponse> regions = new ArrayList<RegionOptionResponse>();

    public List<StatCard> getStats() { return stats; }
    public void setStats(List<StatCard> stats) { this.stats = stats; }
    public PageResponse<InfrastructureResponse> getInfrastructures() { return infrastructures; }
    public void setInfrastructures(PageResponse<InfrastructureResponse> infrastructures) { this.infrastructures = infrastructures; }
    public List<EnvironmentOptionResponse> getEnvironments() { return environments; }
    public void setEnvironments(List<EnvironmentOptionResponse> environments) { this.environments = environments; }
    public List<RegionOptionResponse> getRegions() { return regions; }
    public void setRegions(List<RegionOptionResponse> regions) { this.regions = regions; }
}
