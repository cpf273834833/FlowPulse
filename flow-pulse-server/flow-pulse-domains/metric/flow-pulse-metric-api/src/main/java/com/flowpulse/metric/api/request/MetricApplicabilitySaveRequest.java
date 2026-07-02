package com.flowpulse.metric.api.request;

import javax.validation.constraints.NotBlank;
import javax.validation.constraints.Size;

public class MetricApplicabilitySaveRequest {
    @NotBlank(message = "{metric.applicability.scope.required}")
    @Size(max = 32, message = "{common.status.size}")
    private String scopeType;

    @Size(max = 64, message = "{metric.objectType.size}")
    private String objectType;

    @Size(max = 64, message = "{common.status.size}")
    private String relationType;

    @Size(max = 64, message = "{metric.objectType.size}")
    private String sourceObjectType;

    @Size(max = 64, message = "{metric.objectType.size}")
    private String targetObjectType;

    @Size(max = 32, message = "{common.status.size}")
    private String collectAnchor;

    private String requiredParamsJson;

    private Boolean enabled;

    @Size(max = 512, message = "{common.description.size}")
    private String description;

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
    public String getCollectAnchor() { return collectAnchor; }
    public void setCollectAnchor(String collectAnchor) { this.collectAnchor = collectAnchor; }
    public String getRequiredParamsJson() { return requiredParamsJson; }
    public void setRequiredParamsJson(String requiredParamsJson) { this.requiredParamsJson = requiredParamsJson; }
    public Boolean getEnabled() { return enabled; }
    public void setEnabled(Boolean enabled) { this.enabled = enabled; }
    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }
}
