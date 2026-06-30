package com.flowpulse.topology.api.response;

import java.util.List;

public class TopologyDetailResponse {
    private TopologyResponse topology;
    private List<TopologyNodeResponse> nodes;
    private List<TopologyEdgeResponse> edges;

    public TopologyResponse getTopology() { return topology; }
    public void setTopology(TopologyResponse topology) { this.topology = topology; }
    public List<TopologyNodeResponse> getNodes() { return nodes; }
    public void setNodes(List<TopologyNodeResponse> nodes) { this.nodes = nodes; }
    public List<TopologyEdgeResponse> getEdges() { return edges; }
    public void setEdges(List<TopologyEdgeResponse> edges) { this.edges = edges; }
}
