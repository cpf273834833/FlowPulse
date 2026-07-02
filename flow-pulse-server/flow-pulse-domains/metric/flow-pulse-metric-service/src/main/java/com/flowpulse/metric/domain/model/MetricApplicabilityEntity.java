package com.flowpulse.metric.domain.model;

public class MetricApplicabilityEntity {
    private String id;
    private String tenantId;
    private String metricDefinitionId;
    private String scopeType;
    private String objectType;
    private String relationType;
    private String sourceObjectType;
    private String targetObjectType;
    private String collectAnchor;
    private String requiredParamsJson;
    private Boolean enabled;
    private String description;
    private Long createdAt;
    private Long updatedAt;

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    public String getTenantId() { return tenantId; }
    public void setTenantId(String tenantId) { this.tenantId = tenantId; }
    public String getMetricDefinitionId() { return metricDefinitionId; }
    public void setMetricDefinitionId(String metricDefinitionId) { this.metricDefinitionId = metricDefinitionId; }
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
    public Long getCreatedAt() { return createdAt; }
    public void setCreatedAt(Long createdAt) { this.createdAt = createdAt; }
    public Long getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(Long updatedAt) { this.updatedAt = updatedAt; }
}
