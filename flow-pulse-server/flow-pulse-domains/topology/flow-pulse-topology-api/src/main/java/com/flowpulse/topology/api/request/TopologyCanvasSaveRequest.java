package com.flowpulse.topology.api.request;

import java.util.List;

public class TopologyCanvasSaveRequest {
    private List<TopologyNodeSaveRequest> nodes;
    private List<TopologyEdgeSaveRequest> edges;

    public List<TopologyNodeSaveRequest> getNodes() { return nodes; }
    public void setNodes(List<TopologyNodeSaveRequest> nodes) { this.nodes = nodes; }
    public List<TopologyEdgeSaveRequest> getEdges() { return edges; }
    public void setEdges(List<TopologyEdgeSaveRequest> edges) { this.edges = edges; }
}
