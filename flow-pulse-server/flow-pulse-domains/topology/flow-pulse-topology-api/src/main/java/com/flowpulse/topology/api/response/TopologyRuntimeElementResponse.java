package com.flowpulse.topology.api.response;

import java.util.ArrayList;
import java.util.List;

public class TopologyRuntimeElementResponse {
    private String elementId;
    private String elementType;
    private String objectType;
    private String objectId;
    private String level;
    private List<TopologyRuntimeMetricResponse> metrics = new ArrayList<TopologyRuntimeMetricResponse>();
    private List<TopologyRuntimeAlertResponse> alerts = new ArrayList<TopologyRuntimeAlertResponse>();

    public String getElementId() { return elementId; }
    public void setElementId(String elementId) { this.elementId = elementId; }
    public String getElementType() { return elementType; }
    public void setElementType(String elementType) { this.elementType = elementType; }
    public String getObjectType() { return objectType; }
    public void setObjectType(String objectType) { this.objectType = objectType; }
    public String getObjectId() { return objectId; }
    public void setObjectId(String objectId) { this.objectId = objectId; }
    public String getLevel() { return level; }
    public void setLevel(String level) { this.level = level; }
    public List<TopologyRuntimeMetricResponse> getMetrics() { return metrics; }
    public void setMetrics(List<TopologyRuntimeMetricResponse> metrics) { this.metrics = metrics; }
    public List<TopologyRuntimeAlertResponse> getAlerts() { return alerts; }
    public void setAlerts(List<TopologyRuntimeAlertResponse> alerts) { this.alerts = alerts; }
}
