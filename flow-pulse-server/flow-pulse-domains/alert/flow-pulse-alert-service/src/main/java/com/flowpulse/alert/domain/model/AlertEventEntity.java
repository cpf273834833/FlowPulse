package com.flowpulse.alert.domain.model;

public class AlertEventEntity {
    private String id;
    private String tenantId;
    private String alertStateId;
    private String alertKey;
    private String fromLevel;
    private String toLevel;
    private String eventType;
    private Long eventAt;
    private Double triggerValue;
    private String message;
    private String reasonJson;
    private Long createdAt;

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    public String getTenantId() { return tenantId; }
    public void setTenantId(String tenantId) { this.tenantId = tenantId; }
    public String getAlertStateId() { return alertStateId; }
    public void setAlertStateId(String alertStateId) { this.alertStateId = alertStateId; }
    public String getAlertKey() { return alertKey; }
    public void setAlertKey(String alertKey) { this.alertKey = alertKey; }
    public String getFromLevel() { return fromLevel; }
    public void setFromLevel(String fromLevel) { this.fromLevel = fromLevel; }
    public String getToLevel() { return toLevel; }
    public void setToLevel(String toLevel) { this.toLevel = toLevel; }
    public String getEventType() { return eventType; }
    public void setEventType(String eventType) { this.eventType = eventType; }
    public Long getEventAt() { return eventAt; }
    public void setEventAt(Long eventAt) { this.eventAt = eventAt; }
    public Double getTriggerValue() { return triggerValue; }
    public void setTriggerValue(Double triggerValue) { this.triggerValue = triggerValue; }
    public String getMessage() { return message; }
    public void setMessage(String message) { this.message = message; }
    public String getReasonJson() { return reasonJson; }
    public void setReasonJson(String reasonJson) { this.reasonJson = reasonJson; }
    public Long getCreatedAt() { return createdAt; }
    public void setCreatedAt(Long createdAt) { this.createdAt = createdAt; }
}
