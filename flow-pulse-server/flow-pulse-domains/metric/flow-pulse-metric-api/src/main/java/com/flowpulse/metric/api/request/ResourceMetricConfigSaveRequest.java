package com.flowpulse.metric.api.request;

import javax.validation.constraints.Min;
import javax.validation.constraints.NotBlank;
import javax.validation.constraints.Size;

public class ResourceMetricConfigSaveRequest {
    @NotBlank(message = "{metric.objectType.required}")
    @Size(max = 64, message = "{metric.objectType.size}")
    private String objectType;

    @NotBlank(message = "{metric.object.required}")
    private String objectId;

    @NotBlank(message = "{metric.object.required}")
    @Size(max = 512, message = "{metric.objectType.size}")
    private String objectCode;

    @NotBlank(message = "{metric.object.required}")
    @Size(max = 256, message = "{metric.name.size}")
    private String objectName;

    @NotBlank(message = "{metric.definition.required}")
    private String metricDefinitionId;

    private String implementationId;

    @Size(max = 32, message = "{common.status.size}")
    private String executionMode;

    private String executorNodeId;

    @Min(value = 1, message = "{metric.interval.invalid}")
    private Integer intervalSec;

    private String parameterJson;
    private Boolean enabled;

    @Size(max = 512, message = "{common.description.size}")
    private String description;

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
    public String getImplementationId() { return implementationId; }
    public void setImplementationId(String implementationId) { this.implementationId = implementationId; }
    public String getExecutionMode() { return executionMode; }
    public void setExecutionMode(String executionMode) { this.executionMode = executionMode; }
    public String getExecutorNodeId() { return executorNodeId; }
    public void setExecutorNodeId(String executorNodeId) { this.executorNodeId = executorNodeId; }
    public Integer getIntervalSec() { return intervalSec; }
    public void setIntervalSec(Integer intervalSec) { this.intervalSec = intervalSec; }
    public String getParameterJson() { return parameterJson; }
    public void setParameterJson(String parameterJson) { this.parameterJson = parameterJson; }
    public Boolean getEnabled() { return enabled; }
    public void setEnabled(Boolean enabled) { this.enabled = enabled; }
    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }
}
