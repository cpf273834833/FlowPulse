package com.flowpulse.metric.domain.model;

public class ResourceMetricConfigEntity {
    private String id;
    private String tenantId;
    private String objectType;
    private String objectId;
    private String objectCode;
    private String objectName;
    private String metricDefinitionId;
    private String metricCode;
    private String metricName;
    private String metricKind;
    private String instanceDimension;
    private String sourceMetricCode;
    private String deriveType;
    private String implementationId;
    private String implementationCode;
    private String implementationName;
    private String implementationType;
    private String executionMode;
    private String executorNodeId;
    private Integer intervalSec;
    private String parameterJson;
    private String parameterSignature;
    private Boolean enabled;
    private String taskStatus;
    private String lastCollectStatus;
    private String lastCollectMessage;
    private Long lastCollectAt;
    private Long nextCollectAt;
    private Double currentValue;
    private Long currentValueAt;
    private String description;
    private Long createdAt;
    private Long updatedAt;

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    public String getTenantId() { return tenantId; }
    public void setTenantId(String tenantId) { this.tenantId = tenantId; }
    public String getObjectType() { return objectType; }
    public void setObjectType(String objectType) { this.objectType = objectType; }
    public String getObjectId() { return objectId; }
    public void setObjectId(String objectId) { this.objectId = objectId; }
    public String getObjectCode() { return objectCode; }
    public void setObjectCode(String objectCode) { this.objectCode = objectCode; }
    public String getObjectName() { return objectName; }
    public void setObjectName(String objectName) { this.objectName = objectName; }
    public String getMetricDefinitionId() { return metricDefinitionId; }
    public void setMetricDefinitionId(String metricDefinitionId) { this.metricDefinitionId = metricDefinitionId; }
    public String getMetricCode() { return metricCode; }
    public void setMetricCode(String metricCode) { this.metricCode = metricCode; }
    public String getMetricName() { return metricName; }
    public void setMetricName(String metricName) { this.metricName = metricName; }
    public String getMetricKind() { return metricKind; }
    public void setMetricKind(String metricKind) { this.metricKind = metricKind; }
    public String getInstanceDimension() { return instanceDimension; }
    public void setInstanceDimension(String instanceDimension) { this.instanceDimension = instanceDimension; }
    public String getSourceMetricCode() { return sourceMetricCode; }
    public void setSourceMetricCode(String sourceMetricCode) { this.sourceMetricCode = sourceMetricCode; }
    public String getDeriveType() { return deriveType; }
    public void setDeriveType(String deriveType) { this.deriveType = deriveType; }
    public String getImplementationId() { return implementationId; }
    public void setImplementationId(String implementationId) { this.implementationId = implementationId; }
    public String getImplementationCode() { return implementationCode; }
    public void setImplementationCode(String implementationCode) { this.implementationCode = implementationCode; }
    public String getImplementationName() { return implementationName; }
    public void setImplementationName(String implementationName) { this.implementationName = implementationName; }
    public String getImplementationType() { return implementationType; }
    public void setImplementationType(String implementationType) { this.implementationType = implementationType; }
    public String getExecutionMode() { return executionMode; }
    public void setExecutionMode(String executionMode) { this.executionMode = executionMode; }
    public String getExecutorNodeId() { return executorNodeId; }
    public void setExecutorNodeId(String executorNodeId) { this.executorNodeId = executorNodeId; }
    public Integer getIntervalSec() { return intervalSec; }
    public void setIntervalSec(Integer intervalSec) { this.intervalSec = intervalSec; }
    public String getParameterJson() { return parameterJson; }
    public void setParameterJson(String parameterJson) { this.parameterJson = parameterJson; }
    public String getParameterSignature() { return parameterSignature; }
    public void setParameterSignature(String parameterSignature) { this.parameterSignature = parameterSignature; }
    public Boolean getEnabled() { return enabled; }
    public void setEnabled(Boolean enabled) { this.enabled = enabled; }
    public String getTaskStatus() { return taskStatus; }
    public void setTaskStatus(String taskStatus) { this.taskStatus = taskStatus; }
    public String getLastCollectStatus() { return lastCollectStatus; }
    public void setLastCollectStatus(String lastCollectStatus) { this.lastCollectStatus = lastCollectStatus; }
    public String getLastCollectMessage() { return lastCollectMessage; }
    public void setLastCollectMessage(String lastCollectMessage) { this.lastCollectMessage = lastCollectMessage; }
    public Long getLastCollectAt() { return lastCollectAt; }
    public void setLastCollectAt(Long lastCollectAt) { this.lastCollectAt = lastCollectAt; }
    public Long getNextCollectAt() { return nextCollectAt; }
    public void setNextCollectAt(Long nextCollectAt) { this.nextCollectAt = nextCollectAt; }
    public Double getCurrentValue() { return currentValue; }
    public void setCurrentValue(Double currentValue) { this.currentValue = currentValue; }
    public Long getCurrentValueAt() { return currentValueAt; }
    public void setCurrentValueAt(Long currentValueAt) { this.currentValueAt = currentValueAt; }
    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }
    public Long getCreatedAt() { return createdAt; }
    public void setCreatedAt(Long createdAt) { this.createdAt = createdAt; }
    public Long getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(Long updatedAt) { this.updatedAt = updatedAt; }
}
