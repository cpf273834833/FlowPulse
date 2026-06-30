package com.flowpulse.management.api.response;

import com.flowpulse.common.StatCard;

import java.util.ArrayList;
import java.util.List;

public class EnvironmentRegionPageResponse {
    private List<EnvironmentResponse> environments = new ArrayList<EnvironmentResponse>();
    private List<RegionResponse> regions = new ArrayList<RegionResponse>();
    private List<PlatformConfigResponse> platformConfigs = new ArrayList<PlatformConfigResponse>();
    private List<StatCard> stats = new ArrayList<StatCard>();

    public List<EnvironmentResponse> getEnvironments() { return environments; }
    public void setEnvironments(List<EnvironmentResponse> environments) { this.environments = environments; }
    public List<RegionResponse> getRegions() { return regions; }
    public void setRegions(List<RegionResponse> regions) { this.regions = regions; }
    public List<PlatformConfigResponse> getPlatformConfigs() { return platformConfigs; }
    public void setPlatformConfigs(List<PlatformConfigResponse> platformConfigs) { this.platformConfigs = platformConfigs; }
    public List<StatCard> getStats() { return stats; }
    public void setStats(List<StatCard> stats) { this.stats = stats; }
}
