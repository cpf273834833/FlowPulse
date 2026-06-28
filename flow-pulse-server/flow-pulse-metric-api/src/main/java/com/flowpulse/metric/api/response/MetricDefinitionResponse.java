package com.flowpulse.metric.api.response;

public class MetricDefinitionResponse {
    private String id;
    private String metricCode;
    private String metricName;
    private String metricCategory;
    private String objectType;
    private String valueUnit;
    private Integer valuePrecision;
    private String mappingJson;
    private Boolean enabled;
    private Long implementationCount;
    private String description;
    private Long createdAt;
    private Long updatedAt;

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    public String getMetricCode() { return metricCode; }
    public void setMetricCode(String metricCode) { this.metricCode = metricCode; }
    public String getMetricName() { return metricName; }
    public void setMetricName(String metricName) { this.metricName = metricName; }
    public String getMetricCategory() { return metricCategory; }
    public void setMetricCategory(String metricCategory) { this.metricCategory = metricCategory; }
    public String getObjectType() { return objectType; }
    public void setObjectType(String objectType) { this.objectType = objectType; }
    public String getValueUnit() { return valueUnit; }
    public void setValueUnit(String valueUnit) { this.valueUnit = valueUnit; }
    public Integer getValuePrecision() { return valuePrecision; }
    public void setValuePrecision(Integer valuePrecision) { this.valuePrecision = valuePrecision; }
    public String getMappingJson() { return mappingJson; }
    public void setMappingJson(String mappingJson) { this.mappingJson = mappingJson; }
    public Boolean getEnabled() { return enabled; }
    public void setEnabled(Boolean enabled) { this.enabled = enabled; }
    public Long getImplementationCount() { return implementationCount; }
    public void setImplementationCount(Long implementationCount) { this.implementationCount = implementationCount; }
    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }
    public Long getCreatedAt() { return createdAt; }
    public void setCreatedAt(Long createdAt) { this.createdAt = createdAt; }
    public Long getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(Long updatedAt) { this.updatedAt = updatedAt; }
}
