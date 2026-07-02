package com.flowpulse.metric.api.request;

import javax.validation.constraints.Max;
import javax.validation.constraints.Min;
import javax.validation.constraints.NotBlank;
import javax.validation.constraints.Size;
import java.util.List;

public class MetricDefinitionSaveRequest {
    @NotBlank(message = "{metric.code.required}")
    @Size(max = 128, message = "{metric.code.size}")
    private String metricCode;

    @NotBlank(message = "{metric.name.required}")
    @Size(max = 128, message = "{metric.name.size}")
    private String metricName;

    @NotBlank(message = "{metric.category.required}")
    @Size(max = 32, message = "{common.status.size}")
    private String metricCategory;

    @NotBlank(message = "{metric.objectType.required}")
    @Size(max = 64, message = "{metric.objectType.size}")
    private String objectType;

    @Size(max = 32, message = "{common.status.size}")
    private String valueUnit;

    @Min(value = 0, message = "{metric.precision.range}")
    @Max(value = 8, message = "{metric.precision.range}")
    private Integer valuePrecision;

    @Size(max = 32, message = "{common.status.size}")
    private String metricKind;

    @Size(max = 64, message = "{common.status.size}")
    private String instanceDimension;

    @Size(max = 128, message = "{metric.code.size}")
    private String sourceMetricCode;

    @Size(max = 32, message = "{common.status.size}")
    private String deriveType;

    private String parameterSchemaJson;

    private String mappingJson;

    private Boolean enabled;

    @Size(max = 512, message = "{common.description.size}")
    private String description;

    private List<MetricApplicabilitySaveRequest> applicabilityRules;

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
    public String getMetricKind() { return metricKind; }
    public void setMetricKind(String metricKind) { this.metricKind = metricKind; }
    public String getInstanceDimension() { return instanceDimension; }
    public void setInstanceDimension(String instanceDimension) { this.instanceDimension = instanceDimension; }
    public String getSourceMetricCode() { return sourceMetricCode; }
    public void setSourceMetricCode(String sourceMetricCode) { this.sourceMetricCode = sourceMetricCode; }
    public String getDeriveType() { return deriveType; }
    public void setDeriveType(String deriveType) { this.deriveType = deriveType; }
    public String getParameterSchemaJson() { return parameterSchemaJson; }
    public void setParameterSchemaJson(String parameterSchemaJson) { this.parameterSchemaJson = parameterSchemaJson; }
    public String getMappingJson() { return mappingJson; }
    public void setMappingJson(String mappingJson) { this.mappingJson = mappingJson; }
    public Boolean getEnabled() { return enabled; }
    public void setEnabled(Boolean enabled) { this.enabled = enabled; }
    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }
    public List<MetricApplicabilitySaveRequest> getApplicabilityRules() { return applicabilityRules; }
    public void setApplicabilityRules(List<MetricApplicabilitySaveRequest> applicabilityRules) { this.applicabilityRules = applicabilityRules; }
}
