package com.flowpulse.topology.domain.model;

public class TopologyNodeEntity {
    private String id;
    private String tenantId;
    private String topologyId;
    private String nodeKey;
    private String nodeName;
    private String nodeType;
    private String objectType;
    private String objectId;
    private String objectCode;
    private String objectName;
    private Double x;
    private Double y;
    private Double width;
    private Double height;
    private String styleJson;
    private String metricDisplayJson;
    private Boolean hidden;
    private String groupKey;
    private Long createdAt;
    private Long updatedAt;

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    public String getTenantId() { return tenantId; }
    public void setTenantId(String tenantId) { this.tenantId = tenantId; }
    public String getTopologyId() { return topologyId; }
    public void setTopologyId(String topologyId) { this.topologyId = topologyId; }
    public String getNodeKey() { return nodeKey; }
    public void setNodeKey(String nodeKey) { this.nodeKey = nodeKey; }
    public String getNodeName() { return nodeName; }
    public void setNodeName(String nodeName) { this.nodeName = nodeName; }
    public String getNodeType() { return nodeType; }
    public void setNodeType(String nodeType) { this.nodeType = nodeType; }
    public String getObjectType() { return objectType; }
    public void setObjectType(String objectType) { this.objectType = objectType; }
    public String getObjectId() { return objectId; }
    public void setObjectId(String objectId) { this.objectId = objectId; }
    public String getObjectCode() { return objectCode; }
    public void setObjectCode(String objectCode) { this.objectCode = objectCode; }
    public String getObjectName() { return objectName; }
    public void setObjectName(String objectName) { this.objectName = objectName; }
    public Double getX() { return x; }
    public void setX(Double x) { this.x = x; }
    public Double getY() { return y; }
    public void setY(Double y) { this.y = y; }
    public Double getWidth() { return width; }
    public void setWidth(Double width) { this.width = width; }
    public Double getHeight() { return height; }
    public void setHeight(Double height) { this.height = height; }
    public String getStyleJson() { return styleJson; }
    public void setStyleJson(String styleJson) { this.styleJson = styleJson; }
    public String getMetricDisplayJson() { return metricDisplayJson; }
    public void setMetricDisplayJson(String metricDisplayJson) { this.metricDisplayJson = metricDisplayJson; }
    public Boolean getHidden() { return hidden; }
    public void setHidden(Boolean hidden) { this.hidden = hidden; }
    public String getGroupKey() { return groupKey; }
    public void setGroupKey(String groupKey) { this.groupKey = groupKey; }
    public Long getCreatedAt() { return createdAt; }
    public void setCreatedAt(Long createdAt) { this.createdAt = createdAt; }
    public Long getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(Long updatedAt) { this.updatedAt = updatedAt; }
}
