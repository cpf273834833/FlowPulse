package com.flowpulse.management.domain.model;

public class EnvironmentEntity {
    private String id;
    private String tenantId;
    private String envCode;
    private String envName;
    private String description;
    private Long createdAt;
    private Long updatedAt;

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    public String getTenantId() { return tenantId; }
    public void setTenantId(String tenantId) { this.tenantId = tenantId; }
    public String getEnvCode() { return envCode; }
    public void setEnvCode(String envCode) { this.envCode = envCode; }
    public String getEnvName() { return envName; }
    public void setEnvName(String envName) { this.envName = envName; }
    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }
    public Long getCreatedAt() { return createdAt; }
    public void setCreatedAt(Long createdAt) { this.createdAt = createdAt; }
    public Long getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(Long updatedAt) { this.updatedAt = updatedAt; }
}
