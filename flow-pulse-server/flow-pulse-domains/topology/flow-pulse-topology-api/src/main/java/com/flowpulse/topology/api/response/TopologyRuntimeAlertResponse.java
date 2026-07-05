package com.flowpulse.topology.api.response;

public class TopologyRuntimeAlertResponse {
    private String id;
    private String metricDefinitionId;
    private String level;
    private String status;
    private String message;
    private Double triggerValue;
    private Long firstTriggeredAt;
    private Long lastChangedAt;

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    public String getMetricDefinitionId() { return metricDefinitionId; }
    public void setMetricDefinitionId(String metricDefinitionId) { this.metricDefinitionId = metricDefinitionId; }
    public String getLevel() { return level; }
    public void setLevel(String level) { this.level = level; }
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
    public String getMessage() { return message; }
    public void setMessage(String message) { this.message = message; }
    public Double getTriggerValue() { return triggerValue; }
    public void setTriggerValue(Double triggerValue) { this.triggerValue = triggerValue; }
    public Long getFirstTriggeredAt() { return firstTriggeredAt; }
    public void setFirstTriggeredAt(Long firstTriggeredAt) { this.firstTriggeredAt = firstTriggeredAt; }
    public Long getLastChangedAt() { return lastChangedAt; }
    public void setLastChangedAt(Long lastChangedAt) { this.lastChangedAt = lastChangedAt; }
}
