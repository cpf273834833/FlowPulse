package com.flowpulse.resource.api.response;

public class LogicalObjectResponse {
    private String id;
    private String objectCode;
    private String objectName;
    private String objectType;
    private String envId;
    private String regionId;
    private String sourceType;
    private String sourceInfrastructureId;
    private String matchField;
    private String matchType;
    private String matchPattern;
    private String timeExtractRegex;
    private String timeFormat;
    private String timeReference;
    private String instanceFilterJson;
    private String aggregationJson;
    private String outputMetricJson;
    private Boolean enabled;
    private String description;
    private Long instanceCount;
    private Long activeInstanceCount;
    private Long lastSeenAt;
    private Long createdAt;
    private Long updatedAt;

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    public String getObjectCode() { return objectCode; }
    public void setObjectCode(String objectCode) { this.objectCode = objectCode; }
    public String getObjectName() { return objectName; }
    public void setObjectName(String objectName) { this.objectName = objectName; }
    public String getObjectType() { return objectType; }
    public void setObjectType(String objectType) { this.objectType = objectType; }
    public String getEnvId() { return envId; }
    public void setEnvId(String envId) { this.envId = envId; }
    public String getRegionId() { return regionId; }
    public void setRegionId(String regionId) { this.regionId = regionId; }
    public String getSourceType() { return sourceType; }
    public void setSourceType(String sourceType) { this.sourceType = sourceType; }
    public String getSourceInfrastructureId() { return sourceInfrastructureId; }
    public void setSourceInfrastructureId(String sourceInfrastructureId) { this.sourceInfrastructureId = sourceInfrastructureId; }
    public String getMatchField() { return matchField; }
    public void setMatchField(String matchField) { this.matchField = matchField; }
    public String getMatchType() { return matchType; }
    public void setMatchType(String matchType) { this.matchType = matchType; }
    public String getMatchPattern() { return matchPattern; }
    public void setMatchPattern(String matchPattern) { this.matchPattern = matchPattern; }
    public String getTimeExtractRegex() { return timeExtractRegex; }
    public void setTimeExtractRegex(String timeExtractRegex) { this.timeExtractRegex = timeExtractRegex; }
    public String getTimeFormat() { return timeFormat; }
    public void setTimeFormat(String timeFormat) { this.timeFormat = timeFormat; }
    public String getTimeReference() { return timeReference; }
    public void setTimeReference(String timeReference) { this.timeReference = timeReference; }
    public String getInstanceFilterJson() { return instanceFilterJson; }
    public void setInstanceFilterJson(String instanceFilterJson) { this.instanceFilterJson = instanceFilterJson; }
    public String getAggregationJson() { return aggregationJson; }
    public void setAggregationJson(String aggregationJson) { this.aggregationJson = aggregationJson; }
    public String getOutputMetricJson() { return outputMetricJson; }
    public void setOutputMetricJson(String outputMetricJson) { this.outputMetricJson = outputMetricJson; }
    public Boolean getEnabled() { return enabled; }
    public void setEnabled(Boolean enabled) { this.enabled = enabled; }
    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }
    public Long getInstanceCount() { return instanceCount; }
    public void setInstanceCount(Long instanceCount) { this.instanceCount = instanceCount; }
    public Long getActiveInstanceCount() { return activeInstanceCount; }
    public void setActiveInstanceCount(Long activeInstanceCount) { this.activeInstanceCount = activeInstanceCount; }
    public Long getLastSeenAt() { return lastSeenAt; }
    public void setLastSeenAt(Long lastSeenAt) { this.lastSeenAt = lastSeenAt; }
    public Long getCreatedAt() { return createdAt; }
    public void setCreatedAt(Long createdAt) { this.createdAt = createdAt; }
    public Long getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(Long updatedAt) { this.updatedAt = updatedAt; }
}
