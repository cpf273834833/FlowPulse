package com.flowpulse.topology.domain.model;

public class TopologyEntity {
    private String id;
    private String tenantId;
    private String topologyCode;
    private String topologyName;
    private String envId;
    private String description;
    private String canvasConfigJson;
    private Long createdAt;
    private Long updatedAt;

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    public String getTenantId() { return tenantId; }
    public void setTenantId(String tenantId) { this.tenantId = tenantId; }
    public String getTopologyCode() { return topologyCode; }
    public void setTopologyCode(String topologyCode) { this.topologyCode = topologyCode; }
    public String getTopologyName() { return topologyName; }
    public void setTopologyName(String topologyName) { this.topologyName = topologyName; }
    public String getEnvId() { return envId; }
    public void setEnvId(String envId) { this.envId = envId; }
    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }
    public String getCanvasConfigJson() { return canvasConfigJson; }
    public void setCanvasConfigJson(String canvasConfigJson) { this.canvasConfigJson = canvasConfigJson; }
    public Long getCreatedAt() { return createdAt; }
    public void setCreatedAt(Long createdAt) { this.createdAt = createdAt; }
    public Long getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(Long updatedAt) { this.updatedAt = updatedAt; }
}
