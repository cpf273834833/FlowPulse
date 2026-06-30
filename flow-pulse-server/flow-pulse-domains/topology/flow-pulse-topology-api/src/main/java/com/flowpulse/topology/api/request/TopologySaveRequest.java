package com.flowpulse.topology.api.request;

import javax.validation.constraints.NotBlank;

public class TopologySaveRequest {
    @NotBlank(message = "{topology.code.required}")
    private String topologyCode;
    @NotBlank(message = "{topology.name.required}")
    private String topologyName;
    @NotBlank(message = "{topology.env.required}")
    private String envId;
    private String description;
    private String canvasConfigJson;

    public String getTopologyCode() { return topologyCode; }
    public void setTopologyCode(String topologyCode) { this.topologyCode = topologyCode; }
    public String getTopologyName() { return topologyName; }
    public void setTopologyName(String topologyName) { this.topologyName = topologyName; }
    public String getEnvId() { return envId; }
    public void setEnvId(String envId) { this.envId = envId; }
    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }
    public String getCanvasConfigJson() { return canvasConfigJson; }
    public void setCanvasConfigJson(String canvasConfigJson) { this.canvasConfigJson = canvasConfigJson; }
}
