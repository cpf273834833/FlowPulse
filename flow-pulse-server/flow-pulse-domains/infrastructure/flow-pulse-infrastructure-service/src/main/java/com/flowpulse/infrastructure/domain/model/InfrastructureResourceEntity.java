package com.flowpulse.infrastructure.domain.model;

public class InfrastructureResourceEntity {
    private String id;
    private String tenantId;
    private String infrastructureId;
    private String resourceType;
    private String resourceName;
    private String resourceCode;
    private String status;
    private String metadataJson;
    private Long lastSyncAt;
    private Long createdAt;
    private Long updatedAt;

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    public String getTenantId() { return tenantId; }
    public void setTenantId(String tenantId) { this.tenantId = tenantId; }
    public String getInfrastructureId() { return infrastructureId; }
    public void setInfrastructureId(String infrastructureId) { this.infrastructureId = infrastructureId; }
    public String getResourceType() { return resourceType; }
    public void setResourceType(String resourceType) { this.resourceType = resourceType; }
    public String getResourceName() { return resourceName; }
    public void setResourceName(String resourceName) { this.resourceName = resourceName; }
    public String getResourceCode() { return resourceCode; }
    public void setResourceCode(String resourceCode) { this.resourceCode = resourceCode; }
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
    public String getMetadataJson() { return metadataJson; }
    public void setMetadataJson(String metadataJson) { this.metadataJson = metadataJson; }
    public Long getLastSyncAt() { return lastSyncAt; }
    public void setLastSyncAt(Long lastSyncAt) { this.lastSyncAt = lastSyncAt; }
    public Long getCreatedAt() { return createdAt; }
    public void setCreatedAt(Long createdAt) { this.createdAt = createdAt; }
    public Long getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(Long updatedAt) { this.updatedAt = updatedAt; }
}
