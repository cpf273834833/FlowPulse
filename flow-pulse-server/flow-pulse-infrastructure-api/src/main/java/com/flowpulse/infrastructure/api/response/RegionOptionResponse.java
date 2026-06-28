package com.flowpulse.infrastructure.api.response;

public class RegionOptionResponse {
    private String id;
    private String envId;
    private String parentRegionId;
    private String regionType;
    private String regionCode;
    private String regionName;

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    public String getEnvId() { return envId; }
    public void setEnvId(String envId) { this.envId = envId; }
    public String getParentRegionId() { return parentRegionId; }
    public void setParentRegionId(String parentRegionId) { this.parentRegionId = parentRegionId; }
    public String getRegionType() { return regionType; }
    public void setRegionType(String regionType) { this.regionType = regionType; }
    public String getRegionCode() { return regionCode; }
    public void setRegionCode(String regionCode) { this.regionCode = regionCode; }
    public String getRegionName() { return regionName; }
    public void setRegionName(String regionName) { this.regionName = regionName; }
}
