package com.flowpulse.metric.api.request;

public class MetricApplicabilityRequest {
    private String scopeType;
    private String objectType;
    private String relationType;
    private String sourceObjectType;
    private String targetObjectType;
    private String enabled;

    public String getScopeType() { return scopeType; }
    public void setScopeType(String scopeType) { this.scopeType = scopeType; }
    public String getObjectType() { return objectType; }
    public void setObjectType(String objectType) { this.objectType = objectType; }
    public String getRelationType() { return relationType; }
    public void setRelationType(String relationType) { this.relationType = relationType; }
    public String getSourceObjectType() { return sourceObjectType; }
    public void setSourceObjectType(String sourceObjectType) { this.sourceObjectType = sourceObjectType; }
    public String getTargetObjectType() { return targetObjectType; }
    public void setTargetObjectType(String targetObjectType) { this.targetObjectType = targetObjectType; }
    public String getEnabled() { return enabled; }
    public void setEnabled(String enabled) { this.enabled = enabled; }
}
