package com.flowpulse.topology.api.response;

public class TopologyRuntimeMetricResponse {
    private String configId;
    private String metricDefinitionId;
    private String metricCode;
    private String metricName;
    private String displayName;
    private Integer displayOrder;
    private Boolean showOnTopology;
    private String unit;
    private Double currentValue;
    private Long currentValueAt;
    private String collectStatus;
    private String collectMessage;
    private Long lastCollectAt;

    public String getConfigId() { return configId; }
    public void setConfigId(String configId) { this.configId = configId; }
    public String getMetricDefinitionId() { return metricDefinitionId; }
    public void setMetricDefinitionId(String metricDefinitionId) { this.metricDefinitionId = metricDefinitionId; }
    public String getMetricCode() { return metricCode; }
    public void setMetricCode(String metricCode) { this.metricCode = metricCode; }
    public String getMetricName() { return metricName; }
    public void setMetricName(String metricName) { this.metricName = metricName; }
    public String getDisplayName() { return displayName; }
    public void setDisplayName(String displayName) { this.displayName = displayName; }
    public Integer getDisplayOrder() { return displayOrder; }
    public void setDisplayOrder(Integer displayOrder) { this.displayOrder = displayOrder; }
    public Boolean getShowOnTopology() { return showOnTopology; }
    public void setShowOnTopology(Boolean showOnTopology) { this.showOnTopology = showOnTopology; }
    public String getUnit() { return unit; }
    public void setUnit(String unit) { this.unit = unit; }
    public Double getCurrentValue() { return currentValue; }
    public void setCurrentValue(Double currentValue) { this.currentValue = currentValue; }
    public Long getCurrentValueAt() { return currentValueAt; }
    public void setCurrentValueAt(Long currentValueAt) { this.currentValueAt = currentValueAt; }
    public String getCollectStatus() { return collectStatus; }
    public void setCollectStatus(String collectStatus) { this.collectStatus = collectStatus; }
    public String getCollectMessage() { return collectMessage; }
    public void setCollectMessage(String collectMessage) { this.collectMessage = collectMessage; }
    public Long getLastCollectAt() { return lastCollectAt; }
    public void setLastCollectAt(Long lastCollectAt) { this.lastCollectAt = lastCollectAt; }
}
