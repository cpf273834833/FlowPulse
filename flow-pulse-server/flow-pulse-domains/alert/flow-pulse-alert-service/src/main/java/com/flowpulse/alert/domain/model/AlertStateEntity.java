package com.flowpulse.alert.domain.model;

public class AlertStateEntity {
    private String id;
    private String tenantId;
    private String alertKey;
    private String ruleId;
    private String metricDefinitionId;
    private String objectType;
    private String objectId;
    private String objectCode;
    private String objectName;
    private String topologyId;
    private String topologyElementId;
    private String topologyElementType;
    private String currentLevel;
    private String previousLevel;
    private String status;
    private Long firstTriggeredAt;
    private Long lastChangedAt;
    private Long lastEvaluatedAt;
    private Long recoveredAt;
    private Double triggerValue;
    private String message;
    private String reasonJson;
    private Boolean acknowledged;
    private String acknowledgedBy;
    private Long acknowledgedAt;
    private Long createdAt;
    private Long updatedAt;

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    public String getTenantId() { return tenantId; }
    public void setTenantId(String tenantId) { this.tenantId = tenantId; }
    public String getAlertKey() { return alertKey; }
    public void setAlertKey(String alertKey) { this.alertKey = alertKey; }
    public String getRuleId() { return ruleId; }
    public void setRuleId(String ruleId) { this.ruleId = ruleId; }
    public String getMetricDefinitionId() { return metricDefinitionId; }
    public void setMetricDefinitionId(String metricDefinitionId) { this.metricDefinitionId = metricDefinitionId; }
    public String getObjectType() { return objectType; }
    public void setObjectType(String objectType) { this.objectType = objectType; }
    public String getObjectId() { return objectId; }
    public void setObjectId(String objectId) { this.objectId = objectId; }
    public String getObjectCode() { return objectCode; }
    public void setObjectCode(String objectCode) { this.objectCode = objectCode; }
    public String getObjectName() { return objectName; }
    public void setObjectName(String objectName) { this.objectName = objectName; }
    public String getTopologyId() { return topologyId; }
    public void setTopologyId(String topologyId) { this.topologyId = topologyId; }
    public String getTopologyElementId() { return topologyElementId; }
    public void setTopologyElementId(String topologyElementId) { this.topologyElementId = topologyElementId; }
    public String getTopologyElementType() { return topologyElementType; }
    public void setTopologyElementType(String topologyElementType) { this.topologyElementType = topologyElementType; }
    public String getCurrentLevel() { return currentLevel; }
    public void setCurrentLevel(String currentLevel) { this.currentLevel = currentLevel; }
    public String getPreviousLevel() { return previousLevel; }
    public void setPreviousLevel(String previousLevel) { this.previousLevel = previousLevel; }
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
    public Long getFirstTriggeredAt() { return firstTriggeredAt; }
    public void setFirstTriggeredAt(Long firstTriggeredAt) { this.firstTriggeredAt = firstTriggeredAt; }
    public Long getLastChangedAt() { return lastChangedAt; }
    public void setLastChangedAt(Long lastChangedAt) { this.lastChangedAt = lastChangedAt; }
    public Long getLastEvaluatedAt() { return lastEvaluatedAt; }
    public void setLastEvaluatedAt(Long lastEvaluatedAt) { this.lastEvaluatedAt = lastEvaluatedAt; }
    public Long getRecoveredAt() { return recoveredAt; }
    public void setRecoveredAt(Long recoveredAt) { this.recoveredAt = recoveredAt; }
    public Double getTriggerValue() { return triggerValue; }
    public void setTriggerValue(Double triggerValue) { this.triggerValue = triggerValue; }
    public String getMessage() { return message; }
    public void setMessage(String message) { this.message = message; }
    public String getReasonJson() { return reasonJson; }
    public void setReasonJson(String reasonJson) { this.reasonJson = reasonJson; }
    public Boolean getAcknowledged() { return acknowledged; }
    public void setAcknowledged(Boolean acknowledged) { this.acknowledged = acknowledged; }
    public String getAcknowledgedBy() { return acknowledgedBy; }
    public void setAcknowledgedBy(String acknowledgedBy) { this.acknowledgedBy = acknowledgedBy; }
    public Long getAcknowledgedAt() { return acknowledgedAt; }
    public void setAcknowledgedAt(Long acknowledgedAt) { this.acknowledgedAt = acknowledgedAt; }
    public Long getCreatedAt() { return createdAt; }
    public void setCreatedAt(Long createdAt) { this.createdAt = createdAt; }
    public Long getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(Long updatedAt) { this.updatedAt = updatedAt; }
}
