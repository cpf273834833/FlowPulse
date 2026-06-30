package com.flowpulse.metric.api.response;

public class ThresholdRuleResponse {
    private String id;
    private String ruleCode;
    private String ruleName;
    private String metricDefinitionId;
    private String metricCode;
    private String metricName;
    private String scopeType;
    private String objectType;
    private String objectId;
    private String objectCode;
    private String objectName;
    private String topologyId;
    private String topologyElementId;
    private String topologyElementType;
    private String conditionsJson;
    private Integer evaluationWindowSec;
    private Integer consecutiveCount;
    private String recoveryPolicy;
    private Boolean enabled;
    private String description;
    private Long createdAt;
    private Long updatedAt;

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    public String getRuleCode() { return ruleCode; }
    public void setRuleCode(String ruleCode) { this.ruleCode = ruleCode; }
    public String getRuleName() { return ruleName; }
    public void setRuleName(String ruleName) { this.ruleName = ruleName; }
    public String getMetricDefinitionId() { return metricDefinitionId; }
    public void setMetricDefinitionId(String metricDefinitionId) { this.metricDefinitionId = metricDefinitionId; }
    public String getMetricCode() { return metricCode; }
    public void setMetricCode(String metricCode) { this.metricCode = metricCode; }
    public String getMetricName() { return metricName; }
    public void setMetricName(String metricName) { this.metricName = metricName; }
    public String getScopeType() { return scopeType; }
    public void setScopeType(String scopeType) { this.scopeType = scopeType; }
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
    public String getConditionsJson() { return conditionsJson; }
    public void setConditionsJson(String conditionsJson) { this.conditionsJson = conditionsJson; }
    public Integer getEvaluationWindowSec() { return evaluationWindowSec; }
    public void setEvaluationWindowSec(Integer evaluationWindowSec) { this.evaluationWindowSec = evaluationWindowSec; }
    public Integer getConsecutiveCount() { return consecutiveCount; }
    public void setConsecutiveCount(Integer consecutiveCount) { this.consecutiveCount = consecutiveCount; }
    public String getRecoveryPolicy() { return recoveryPolicy; }
    public void setRecoveryPolicy(String recoveryPolicy) { this.recoveryPolicy = recoveryPolicy; }
    public Boolean getEnabled() { return enabled; }
    public void setEnabled(Boolean enabled) { this.enabled = enabled; }
    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }
    public Long getCreatedAt() { return createdAt; }
    public void setCreatedAt(Long createdAt) { this.createdAt = createdAt; }
    public Long getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(Long updatedAt) { this.updatedAt = updatedAt; }
}
