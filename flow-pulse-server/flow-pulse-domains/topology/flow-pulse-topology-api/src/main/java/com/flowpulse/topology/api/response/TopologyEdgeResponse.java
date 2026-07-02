package com.flowpulse.topology.api.response;

public class TopologyEdgeResponse {
    private String id;
    private String edgeKey;
    private String edgeName;
    private String edgeType;
    private String sourceNodeId;
    private String targetNodeId;
    private String relationType;
    private String relationId;
    private String sourceObjectType;
    private String sourceObjectId;
    private String targetObjectType;
    private String targetObjectId;
    private String pathJson;
    private String labelPositionJson;
    private String styleJson;
    private String metricDisplayJson;
    private Boolean hidden;
    private String alertLevel;
    private String alertStatus;

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
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
    public String getSourceObjectType() { return sourceObjectType; }
    public void setSourceObjectType(String sourceObjectType) { this.sourceObjectType = sourceObjectType; }
    public String getSourceObjectId() { return sourceObjectId; }
    public void setSourceObjectId(String sourceObjectId) { this.sourceObjectId = sourceObjectId; }
    public String getTargetObjectType() { return targetObjectType; }
    public void setTargetObjectType(String targetObjectType) { this.targetObjectType = targetObjectType; }
    public String getTargetObjectId() { return targetObjectId; }
    public void setTargetObjectId(String targetObjectId) { this.targetObjectId = targetObjectId; }
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
    public String getAlertLevel() { return alertLevel; }
    public void setAlertLevel(String alertLevel) { this.alertLevel = alertLevel; }
    public String getAlertStatus() { return alertStatus; }
    public void setAlertStatus(String alertStatus) { this.alertStatus = alertStatus; }
}
