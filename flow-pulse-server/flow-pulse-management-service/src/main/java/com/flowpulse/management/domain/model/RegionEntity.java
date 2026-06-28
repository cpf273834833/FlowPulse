package com.flowpulse.management.domain.model;

public class RegionEntity {
    private String id;
    private String tenantId;
    private String envId;
    private String parentRegionId;
    private String regionType;
    private String regionCode;
    private String regionName;
    private String description;
    private Long createdAt;
    private Long updatedAt;

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    public String getTenantId() { return tenantId; }
    public void setTenantId(String tenantId) { this.tenantId = tenantId; }
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
    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }
    public Long getCreatedAt() { return createdAt; }
    public void setCreatedAt(Long createdAt) { this.createdAt = createdAt; }
    public Long getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(Long updatedAt) { this.updatedAt = updatedAt; }
}
