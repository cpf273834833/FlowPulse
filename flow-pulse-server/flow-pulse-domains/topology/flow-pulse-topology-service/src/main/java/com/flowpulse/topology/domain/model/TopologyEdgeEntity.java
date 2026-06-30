package com.flowpulse.topology.domain.model;

public class TopologyEdgeEntity {
    private String id;
    private String tenantId;
    private String topologyId;
    private String edgeKey;
    private String edgeName;
    private String edgeType;
    private String sourceNodeId;
    private String targetNodeId;
    private String relationType;
    private String relationId;
    private String pathJson;
    private String labelPositionJson;
    private String styleJson;
    private String metricDisplayJson;
    private Boolean hidden;
    private Long createdAt;
    private Long updatedAt;

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    public String getTenantId() { return tenantId; }
    public void setTenantId(String tenantId) { this.tenantId = tenantId; }
    public String getTopologyId() { return topologyId; }
    public void setTopologyId(String topologyId) { this.topologyId = topologyId; }
    public String getEdgeKey() { return edgeKey; }
    public void setEdgeKey(String edgeKey) { this.edgeKey = edgeKey; }
    public String getEdgeName() { return edgeName; }
    public void setEdgeName(String edgeName) { this.edgeName = edgeName; }
    public String getEdgeType() { return edgeType; }
    public void setEdgeType(String edgeType) { this.edgeType = edgeType; }
    public String getSourceNodeId() { return sourceNodeId; }
    public void setSourceNodeId(String sourceNodeId) { this.sourceNodeId = sourceNodeId; }
    public String getTargetNodeId() { return targetNodeId; }
    public void setTargetNodeId(String targetNodeId) { this.targetNodeId = targetNodeId; }
    public String getRelationType() { return relationType; }
    public void setRelationType(String relationType) { this.relationType = relationType; }
    public String getRelationId() { return relationId; }
    public void setRelationId(String relationId) { this.relationId = relationId; }
    public String getPathJson() { return pathJson; }
    public void setPathJson(String pathJson) { this.pathJson = pathJson; }
    public String getLabelPositionJson() { return labelPositionJson; }
    public void setLabelPositionJson(String labelPositionJson) { this.labelPositionJson = labelPositionJson; }
    public String getStyleJson() { return styleJson; }
    public void setStyleJson(String styleJson) { this.styleJson = styleJson; }
    public String getMetricDisplayJson() { return metricDisplayJson; }
    public void setMetricDisplayJson(String metricDisplayJson) { this.metricDisplayJson = metricDisplayJson; }
    public Boolean getHidden() { return hidden; }
    public void setHidden(Boolean hidden) { this.hidden = hidden; }
    public Long getCreatedAt() { return createdAt; }
    public void setCreatedAt(Long createdAt) { this.createdAt = createdAt; }
    public Long getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(Long updatedAt) { this.updatedAt = updatedAt; }
}
