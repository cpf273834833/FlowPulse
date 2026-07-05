package com.flowpulse.topology.api.response;

public class TopologyResponse {
    private String id;
    private String topologyCode;
    private String topologyName;
    private String envId;
    private String description;
    private String canvasConfigJson;
    private Long nodeCount;
    private Long edgeCount;
    private String alertLevel;
    private Long createdAt;
    private Long updatedAt;

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
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
    public Long getNodeCount() { return nodeCount; }
    public void setNodeCount(Long nodeCount) { this.nodeCount = nodeCount; }
    public Long getEdgeCount() { return edgeCount; }
    public void setEdgeCount(Long edgeCount) { this.edgeCount = edgeCount; }
    public String getAlertLevel() { return alertLevel; }
    public void setAlertLevel(String alertLevel) { this.alertLevel = alertLevel; }
    public Long getCreatedAt() { return createdAt; }
    public void setCreatedAt(Long createdAt) { this.createdAt = createdAt; }
    public Long getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(Long updatedAt) { this.updatedAt = updatedAt; }
}
