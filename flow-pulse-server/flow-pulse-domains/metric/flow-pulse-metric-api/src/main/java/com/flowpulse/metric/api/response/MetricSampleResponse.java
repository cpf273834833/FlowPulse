package com.flowpulse.metric.api.response;

public class MetricSampleResponse {
    private String id;
    private String configId;
    private String metricCode;
    private String objectType;
    private String objectId;
    private String objectCode;
    private String infrastructureType;
    private String infrastructureId;
    private String instance;
    private String seriesType;
    private String quality;
    private Double value;
    private Long collectedAt;
    private String metadataJson;

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    public String getConfigId() { return configId; }
    public void setConfigId(String configId) { this.configId = configId; }
    public String getMetricCode() { return metricCode; }
    public void setMetricCode(String metricCode) { this.metricCode = metricCode; }
    public String getObjectType() { return objectType; }
    public void setObjectType(String objectType) { this.objectType = objectType; }
    public String getObjectId() { return objectId; }
    public void setObjectId(String objectId) { this.objectId = objectId; }
    public String getObjectCode() { return objectCode; }
    public void setObjectCode(String objectCode) { this.objectCode = objectCode; }
    public String getInfrastructureType() { return infrastructureType; }
    public void setInfrastructureType(String infrastructureType) { this.infrastructureType = infrastructureType; }
    public String getInfrastructureId() { return infrastructureId; }
    public void setInfrastructureId(String infrastructureId) { this.infrastructureId = infrastructureId; }
    public String getInstance() { return instance; }
    public void setInstance(String instance) { this.instance = instance; }
    public String getSeriesType() { return seriesType; }
    public void setSeriesType(String seriesType) { this.seriesType = seriesType; }
    public String getQuality() { return quality; }
    public void setQuality(String quality) { this.quality = quality; }
    public Double getValue() { return value; }
    public void setValue(Double value) { this.value = value; }
    public Long getCollectedAt() { return collectedAt; }
    public void setCollectedAt(Long collectedAt) { this.collectedAt = collectedAt; }
    public String getMetadataJson() { return metadataJson; }
    public void setMetadataJson(String metadataJson) { this.metadataJson = metadataJson; }
}
