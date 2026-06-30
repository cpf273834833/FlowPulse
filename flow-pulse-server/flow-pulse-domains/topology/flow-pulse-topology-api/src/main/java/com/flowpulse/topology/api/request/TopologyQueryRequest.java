package com.flowpulse.topology.api.request;

public class TopologyQueryRequest {
    private Integer pageNo;
    private Integer pageSize;
    private String keyword;
    private String envId;

    public Integer getPageNo() { return pageNo; }
    public void setPageNo(Integer pageNo) { this.pageNo = pageNo; }
    public Integer getPageSize() { return pageSize; }
    public void setPageSize(Integer pageSize) { this.pageSize = pageSize; }
    public String getKeyword() { return keyword; }
    public void setKeyword(String keyword) { this.keyword = keyword; }
    public String getEnvId() { return envId; }
    public void setEnvId(String envId) { this.envId = envId; }
}
