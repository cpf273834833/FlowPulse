package com.flowpulse.metric.api.request;

public class ResourceMetricConfigQueryRequest {
    private String keyword;
    private String objectType;
    private String objectId;
    private String metricDefinitionId;
    private String enabled;
    private Integer pageNo;
    private Integer pageSize;

    public String getKeyword() { return keyword; }
    public void setKeyword(String keyword) { this.keyword = keyword; }
    public String getObjectType() { return objectType; }
    public void setObjectType(String objectType) { this.objectType = objectType; }
    public String getObjectId() { return objectId; }
    public void setObjectId(String objectId) { this.objectId = objectId; }
    public String getMetricDefinitionId() { return metricDefinitionId; }
    public void setMetricDefinitionId(String metricDefinitionId) { this.metricDefinitionId = metricDefinitionId; }
    public String getEnabled() { return enabled; }
    public void setEnabled(String enabled) { this.enabled = enabled; }
    public Integer getPageNo() { return pageNo; }
    public void setPageNo(Integer pageNo) { this.pageNo = pageNo; }
    public Integer getPageSize() { return pageSize; }
    public void setPageSize(Integer pageSize) { this.pageSize = pageSize; }
}
