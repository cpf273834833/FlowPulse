package com.flowpulse.metric.api.request;

import javax.validation.constraints.Min;
import javax.validation.constraints.NotBlank;
import javax.validation.constraints.Size;

public class MetricImplementationSaveRequest {
    @NotBlank(message = "{metric.definition.required}")
    private String metricDefinitionId;

    @NotBlank(message = "{metric.implementation.code.required}")
    @Size(max = 128, message = "{metric.code.size}")
    private String implementationCode;

    @NotBlank(message = "{metric.implementation.name.required}")
    @Size(max = 128, message = "{metric.name.size}")
    private String implementationName;

    @NotBlank(message = "{metric.implementation.type.required}")
    @Size(max = 32, message = "{common.status.size}")
    private String implementationType;

    @Size(max = 32, message = "{common.status.size}")
    private String executionMode;

    @Size(max = 64, message = "{common.status.size}")
    private String scriptLanguage;

    private String scriptContent;
    private String parameterSchemaJson;
    private String outputSchemaJson;
    private String builtInCollector;
    private Boolean defaultImplementation;
    private Boolean enabled;

    @Min(value = 1, message = "{metric.interval.invalid}")
    private Integer timeoutSec;

    @Size(max = 512, message = "{common.description.size}")
    private String description;

    public String getMetricDefinitionId() { return metricDefinitionId; }
    public void setMetricDefinitionId(String metricDefinitionId) { this.metricDefinitionId = metricDefinitionId; }
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
}
