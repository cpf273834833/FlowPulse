package com.flowpulse.metric.api.request;

import javax.validation.constraints.NotBlank;
import javax.validation.constraints.NotNull;

public class ThresholdRuleSaveRequest {
    @NotBlank(message = "{threshold.rule.code.required}")
    private String ruleCode;
    @NotBlank(message = "{threshold.rule.name.required}")
    private String ruleName;
    @NotBlank(message = "{metric.definition.id.required}")
    private String metricDefinitionId;
    @NotBlank(message = "{threshold.scope.type.required}")
    private String scopeType;
    private String objectType;
    private String objectId;
    private String objectCode;
    private String objectName;
    private String topologyId;
    private String topologyElementId;
    private String topologyElementType;
    @NotBlank(message = "{threshold.conditions.required}")
    private String conditionsJson;
    @NotNull(message = "{threshold.evaluation.window.required}")
    private Integer evaluationWindowSec;
    @NotNull(message = "{threshold.consecutive.count.required}")
    private Integer consecutiveCount;
    private String recoveryPolicy;
    private Boolean enabled;
    private String description;

    public String getRuleCode() {
        return ruleCode;
    }

    public void setRuleCode(String ruleCode) {
        this.ruleCode = ruleCode;
    }

    public String getRuleName() {
        return ruleName;
    }

    public void setRuleName(String ruleName) {
        this.ruleName = ruleName;
    }

    public String getMetricDefinitionId() {
        return metricDefinitionId;
    }

    public void setMetricDefinitionId(String metricDefinitionId) {
        this.metricDefinitionId = metricDefinitionId;
    }

    public String getScopeType() {
        return scopeType;
    }

    public void setScopeType(String scopeType) {
        this.scopeType = scopeType;
    }

    public String getObjectType() {
        return objectType;
    }

    public void setObjectType(String objectType) {
        this.objectType = objectType;
    }

    public String getObjectId() {
        return objectId;
    }

    public void setObjectId(String objectId) {
        this.objectId = objectId;
    }

    public String getObjectCode() {
        return objectCode;
    }

    public void setObjectCode(String objectCode) {
        this.objectCode = objectCode;
    }

    public String getObjectName() {
        return objectName;
    }

    public void setObjectName(String objectName) {
        this.objectName = objectName;
    }

    public String getTopologyId() {
        return topologyId;
    }

    public void setTopologyId(String topologyId) {
        this.topologyId = topologyId;
    }

    public String getTopologyElementId() {
        return topologyElementId;
    }

    public void setTopologyElementId(String topologyElementId) {
        this.topologyElementId = topologyElementId;
    }

    public String getTopologyElementType() {
        return topologyElementType;
    }

    public void setTopologyElementType(String topologyElementType) {
        this.topologyElementType = topologyElementType;
    }

    public String getConditionsJson() {
        return conditionsJson;
    }

    public void setConditionsJson(String conditionsJson) {
        this.conditionsJson = conditionsJson;
    }

    public Integer getEvaluationWindowSec() {
        return evaluationWindowSec;
    }

    public void setEvaluationWindowSec(Integer evaluationWindowSec) {
        this.evaluationWindowSec = evaluationWindowSec;
    }

    public Integer getConsecutiveCount() {
        return consecutiveCount;
    }

    public void setConsecutiveCount(Integer consecutiveCount) {
        this.consecutiveCount = consecutiveCount;
    }

    public String getRecoveryPolicy() {
        return recoveryPolicy;
    }

    public void setRecoveryPolicy(String recoveryPolicy) {
        this.recoveryPolicy = recoveryPolicy;
    }

    public Boolean getEnabled() {
        return enabled;
    }

    public void setEnabled(Boolean enabled) {
        this.enabled = enabled;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }
}
