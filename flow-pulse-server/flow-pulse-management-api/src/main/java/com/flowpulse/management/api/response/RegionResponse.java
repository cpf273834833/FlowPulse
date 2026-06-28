package com.flowpulse.management.api.response;

public class RegionResponse {
    private String id;
    private String envId;
    private String envName;
    private String parentRegionId;
    private String parentRegionName;
    private String regionType;
    private String regionCode;
    private String regionName;
    private String description;
    private Long createdAt;
    private Long updatedAt;

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    public String getEnvId() { return envId; }
    public void setEnvId(String envId) { this.envId = envId; }
    public String getEnvName() { return envName; }
    public void setEnvName(String envName) { this.envName = envName; }
    public String getParentRegionId() { return parentRegionId; }
    public void setParentRegionId(String parentRegionId) { this.parentRegionId = parentRegionId; }
    public String getParentRegionName() { return parentRegionName; }
    public void setParentRegionName(String parentRegionName) { this.parentRegionName = parentRegionName; }
    public String getRegionType() { return regionType; }
    public void setRegionType(String regionType) { this.regionType = regionType; }
    public String getRegionCode() { return regionCode; }
    public void setRegionCode(String regionCode) { this.regionCode = regionCode; }
    public String getRegionName() { return regionName; }
    public void setRegionName(String regionName) { this.regionName = regionName; }
    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }
    public Long getCreatedAt() { return createdAt; }
    public void setCreatedAt(Long createdAt) { this.createdAt = createdAt; }
    public Long getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(Long updatedAt) { this.updatedAt = updatedAt; }
}
