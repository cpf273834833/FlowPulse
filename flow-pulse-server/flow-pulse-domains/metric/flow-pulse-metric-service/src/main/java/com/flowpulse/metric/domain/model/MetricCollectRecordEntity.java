package com.flowpulse.metric.domain.model;

public class MetricCollectRecordEntity {
    private String id;
    private String tenantId;
    private String configId;
    private String metricDefinitionId;
    private String metricCode;
    private String implementationId;
    private String implementationCode;
    private String objectType;
    private String objectId;
    private String objectCode;
    private String executionMode;
    private String executorNodeId;
    private String status;
    private Double value;
    private String message;
    private Long startedAt;
    private Long finishedAt;
    private Long durationMs;
    private Long createdAt;

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    public String getTenantId() { return tenantId; }
    public void setTenantId(String tenantId) { this.tenantId = tenantId; }
    public String getConfigId() { return configId; }
    public void setConfigId(String configId) { this.configId = configId; }
    public String getMetricDefinitionId() { return metricDefinitionId; }
    public void setMetricDefinitionId(String metricDefinitionId) { this.metricDefinitionId = metricDefinitionId; }
    public String getMetricCode() { return metricCode; }
    public void setMetricCode(String metricCode) { this.metricCode = metricCode; }
    public String getImplementationId() { return implementationId; }
    public void setImplementationId(String implementationId) { this.implementationId = implementationId; }
    public String getImplementationCode() { return implementationCode; }
    public void setImplementationCode(String implementationCode) { this.implementationCode = implementationCode; }
    public String getObjectType() { return objectType; }
    public void setObjectType(String objectType) { this.objectType = objectType; }
    public String getObjectId() { return objectId; }
    public void setObjectId(String objectId) { this.objectId = objectId; }
    public String getObjectCode() { return objectCode; }
    public void setObjectCode(String objectCode) { this.objectCode = objectCode; }
    public String getExecutionMode() { return executionMode; }
    public void setExecutionMode(String executionMode) { this.executionMode = executionMode; }
    public String getExecutorNodeId() { return executorNodeId; }
    public void setExecutorNodeId(String executorNodeId) { this.executorNodeId = executorNodeId; }
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
    public Double getValue() { return value; }
    public void setValue(Double value) { this.value = value; }
    public String getMessage() { return message; }
    public void setMessage(String message) { this.message = message; }
    public Long getStartedAt() { return startedAt; }
    public void setStartedAt(Long startedAt) { this.startedAt = startedAt; }
    public Long getFinishedAt() { return finishedAt; }
    public void setFinishedAt(Long finishedAt) { this.finishedAt = finishedAt; }
    public Long getDurationMs() { return durationMs; }
    public void setDurationMs(Long durationMs) { this.durationMs = durationMs; }
    public Long getCreatedAt() { return createdAt; }
    public void setCreatedAt(Long createdAt) { this.createdAt = createdAt; }
}
