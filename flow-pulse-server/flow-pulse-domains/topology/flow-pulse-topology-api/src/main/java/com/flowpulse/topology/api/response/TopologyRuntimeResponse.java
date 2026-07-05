package com.flowpulse.topology.api.response;

import java.util.ArrayList;
import java.util.List;

public class TopologyRuntimeResponse {
    private String topologyId;
    private String level;
    private Long refreshedAt;
    private Integer alertElementCount;
    private List<TopologyRuntimeElementResponse> elements = new ArrayList<TopologyRuntimeElementResponse>();

    public String getTopologyId() { return topologyId; }
    public void setTopologyId(String topologyId) { this.topologyId = topologyId; }
    public String getLevel() { return level; }
    public void setLevel(String level) { this.level = level; }
    public Long getRefreshedAt() { return refreshedAt; }
    public void setRefreshedAt(Long refreshedAt) { this.refreshedAt = refreshedAt; }
    public Integer getAlertElementCount() { return alertElementCount; }
    public void setAlertElementCount(Integer alertElementCount) { this.alertElementCount = alertElementCount; }
    public List<TopologyRuntimeElementResponse> getElements() { return elements; }
    public void setElements(List<TopologyRuntimeElementResponse> elements) { this.elements = elements; }
}
