package com.flowpulse.resource.api.request;

import javax.validation.constraints.NotBlank;
import javax.validation.constraints.Size;

public class LogicalObjectSaveRequest {
    @NotBlank(message = "{logical.object.code.required}")
    @Size(max = 64, message = "{logical.object.code.size}")
    private String objectCode;
    @NotBlank(message = "{logical.object.name.required}")
    @Size(max = 128, message = "{logical.object.name.size}")
    private String objectName;
    @NotBlank(message = "{logical.object.type.required}")
    private String objectType;
    @NotBlank(message = "{logical.object.env.required}")
    private String envId;
    private String regionId;
    @NotBlank(message = "{logical.object.source.type.required}")
    private String sourceType;
    private String sourceInfrastructureId;
    private String matchField;
    private String matchType;
    @Size(max = 1024, message = "{logical.object.match.pattern.size}")
    private String matchPattern;
    private String timeExtractRegex;
    private String timeFormat;
    private String timeReference;
    private String instanceFilterJson;
    private String aggregationJson;
    private String outputMetricJson;
    private Boolean enabled;
    private String description;

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
}
