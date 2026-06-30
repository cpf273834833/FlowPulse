package com.flowpulse.alert.api.request;

public class AlertStateQueryRequest {
    private Integer pageNo;
    private Integer pageSize;
    private String keyword;
    private String level;
    private String status;
    private String objectType;
    private String topologyId;
    private String topologyElementId;

    public Integer getPageNo() { return pageNo; }
    public void setPageNo(Integer pageNo) { this.pageNo = pageNo; }
    public Integer getPageSize() { return pageSize; }
    public void setPageSize(Integer pageSize) { this.pageSize = pageSize; }
    public String getKeyword() { return keyword; }
    public void setKeyword(String keyword) { this.keyword = keyword; }
    public String getLevel() { return level; }
    public void setLevel(String level) { this.level = level; }
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
    public String getObjectType() { return objectType; }
    public void setObjectType(String objectType) { this.objectType = objectType; }
    public String getTopologyId() { return topologyId; }
    public void setTopologyId(String topologyId) { this.topologyId = topologyId; }
    public String getTopologyElementId() { return topologyElementId; }
    public void setTopologyElementId(String topologyElementId) { this.topologyElementId = topologyElementId; }
}
