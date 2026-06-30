package com.flowpulse.resource.api.response;

public class LogicalObjectInstanceResponse {
    private String id;
    private String logicalObjectId;
    private String physicalObjectType;
    private String physicalObjectId;
    private String physicalObjectCode;
    private String physicalObjectName;
    private String status;
    private String metricJson;
    private Long firstSeenAt;
    private Long lastSeenAt;
    private String metadataJson;

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    public String getLogicalObjectId() { return logicalObjectId; }
    public void setLogicalObjectId(String logicalObjectId) { this.logicalObjectId = logicalObjectId; }
    public String getPhysicalObjectType() { return physicalObjectType; }
    public void setPhysicalObjectType(String physicalObjectType) { this.physicalObjectType = physicalObjectType; }
    public String getPhysicalObjectId() { return physicalObjectId; }
    public void setPhysicalObjectId(String physicalObjectId) { this.physicalObjectId = physicalObjectId; }
    public String getPhysicalObjectCode() { return physicalObjectCode; }
    public void setPhysicalObjectCode(String physicalObjectCode) { this.physicalObjectCode = physicalObjectCode; }
    public String getPhysicalObjectName() { return physicalObjectName; }
    public void setPhysicalObjectName(String physicalObjectName) { this.physicalObjectName = physicalObjectName; }
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
    public String getMetricJson() { return metricJson; }
    public void setMetricJson(String metricJson) { this.metricJson = metricJson; }
    public Long getFirstSeenAt() { return firstSeenAt; }
    public void setFirstSeenAt(Long firstSeenAt) { this.firstSeenAt = firstSeenAt; }
    public Long getLastSeenAt() { return lastSeenAt; }
    public void setLastSeenAt(Long lastSeenAt) { this.lastSeenAt = lastSeenAt; }
    public String getMetadataJson() { return metadataJson; }
    public void setMetadataJson(String metadataJson) { this.metadataJson = metadataJson; }
}
