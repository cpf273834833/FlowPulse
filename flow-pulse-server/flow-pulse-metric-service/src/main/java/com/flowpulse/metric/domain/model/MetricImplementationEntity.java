package com.flowpulse.metric.domain.model;

public class MetricImplementationEntity {
    private String id;
    private String tenantId;
    private String metricDefinitionId;
    private String metricCode;
    private String metricName;
    private String implementationCode;
    private String implementationName;
    private String implementationType;
    private String executionMode;
    private String scriptLanguage;
    private String scriptContent;
    private String configJson;
    private String parameterSchemaJson;
    private String outputSchemaJson;
    private String builtInCollector;
    private Boolean defaultImplementation;
    private Boolean enabled;
    private Integer timeoutSec;
    private String description;
    private Long createdAt;
    private Long updatedAt;

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    public String getTenantId() { return tenantId; }
    public void setTenantId(String tenantId) { this.tenantId = tenantId; }
    public String getMetricDefinitionId() { return metricDefinitionId; }
    public void setMetricDefinitionId(String metricDefinitionId) { this.metricDefinitionId = metricDefinitionId; }
    public String getMetricCode() { return metricCode; }
    public void setMetricCode(String metricCode) { this.metricCode = metricCode; }
    public String getMetricName() { return metricName; }
    public void setMetricName(String metricName) { this.metricName = metricName; }
    public String getImplementationCode() { return implementationCode; }
    public void setImplementationCode(String implementationCode) { this.implementationCode = implementationCode; }
    public String getImplementationName() { return implementationName; }
    public void setImplementationName(String implementationName) { this.implementationName = implementationName; }
    public String getImplementationType() { return implementationType; }
    public void setImplementationType(String implementationType) { this.implementationType = implementationType; }
    public String getExecutionMode() { return executionMode; }
    public void setExecutionMode(String executionMode) { this.executionMode = executionMode; }
    public String getScriptLanguage() { return scriptLanguage; }
    public void setScriptLanguage(String scriptLanguage) { this.scriptLanguage = scriptLanguage; }
    public String getScriptContent() { return scriptContent; }
    public void setScriptContent(String scriptContent) { this.scriptContent = scriptContent; }
    public String getConfigJson() { return configJson; }
    public void setConfigJson(String configJson) { this.configJson = configJson; }
    public String getParameterSchemaJson() { return parameterSchemaJson; }
    public void setParameterSchemaJson(String parameterSchemaJson) { this.parameterSchemaJson = parameterSchemaJson; }
    public String getOutputSchemaJson() { return outputSchemaJson; }
    public void setOutputSchemaJson(String outputSchemaJson) { this.outputSchemaJson = outputSchemaJson; }
    public String getBuiltInCollector() { return builtInCollector; }
    public void setBuiltInCollector(String builtInCollector) { this.builtInCollector = builtInCollector; }
    public Boolean getDefaultImplementation() { return defaultImplementation; }
    public void setDefaultImplementation(Boolean defaultImplementation) { this.defaultImplementation = defaultImplementation; }
    public Boolean getEnabled() { return enabled; }
    public void setEnabled(Boolean enabled) { this.enabled = enabled; }
    public Integer getTimeoutSec() { return timeoutSec; }
    public void setTimeoutSec(Integer timeoutSec) { this.timeoutSec = timeoutSec; }
    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }
    public Long getCreatedAt() { return createdAt; }
    public void setCreatedAt(Long createdAt) { this.createdAt = createdAt; }
    public Long getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(Long updatedAt) { this.updatedAt = updatedAt; }
}
