package com.flowpulse.topology.application;

import com.flowpulse.common.BusinessException;
import com.flowpulse.common.ErrorCode;
import com.flowpulse.common.IdGenerator;
import com.flowpulse.common.StatCard;
import com.flowpulse.topology.api.request.TopologyCanvasSaveRequest;
import com.flowpulse.topology.api.request.TopologyEdgeSaveRequest;
import com.flowpulse.topology.api.request.TopologyNodeSaveRequest;
import com.flowpulse.topology.api.request.TopologyQueryRequest;
import com.flowpulse.topology.api.request.TopologySaveRequest;
import com.flowpulse.topology.api.response.PageResponse;
import com.flowpulse.topology.api.response.TopologyDetailResponse;
import com.flowpulse.topology.api.response.TopologyEdgeResponse;
import com.flowpulse.topology.api.response.TopologyNodeResponse;
import com.flowpulse.topology.api.response.TopologyPageResponse;
import com.flowpulse.topology.api.response.TopologyResponse;
import com.flowpulse.topology.domain.model.TopologyEdgeEntity;
import com.flowpulse.topology.domain.model.TopologyEntity;
import com.flowpulse.topology.domain.model.TopologyNodeEntity;
import com.flowpulse.topology.infrastructure.persistence.mapper.TopologyEdgeMapper;
import com.flowpulse.topology.infrastructure.persistence.mapper.TopologyMapper;
import com.flowpulse.topology.infrastructure.persistence.mapper.TopologyNodeMapper;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;

@Service
public class TopologyService {
    private final TopologyMapper topologyMapper;
    private final TopologyNodeMapper topologyNodeMapper;
    private final TopologyEdgeMapper topologyEdgeMapper;

    public TopologyService(TopologyMapper topologyMapper, TopologyNodeMapper topologyNodeMapper, TopologyEdgeMapper topologyEdgeMapper) {
        this.topologyMapper = topologyMapper;
        this.topologyNodeMapper = topologyNodeMapper;
        this.topologyEdgeMapper = topologyEdgeMapper;
    }

    public TopologyPageResponse page(String tenantId, TopologyQueryRequest request) {
        TopologyQueryRequest query = request == null ? new TopologyQueryRequest() : request;
        int pageNo = positive(query.getPageNo(), 1);
        int pageSize = bounded(query.getPageSize(), 10, 100);
        List<TopologyEntity> rows = topologyMapper.selectPage(tenantId, trim(query.getKeyword()), trim(query.getEnvId()), (pageNo - 1) * pageSize, pageSize);
        long total = topologyMapper.countPage(tenantId, trim(query.getKeyword()), trim(query.getEnvId()));
        PageResponse<TopologyResponse> page = new PageResponse<TopologyResponse>();
        page.setRecords(toTopologyResponses(rows));
        page.setTotal(total);
        page.setPageNo(pageNo);
        page.setPageSize(pageSize);
        TopologyPageResponse response = new TopologyPageResponse();
        response.setTopologies(page);
        response.setStats(buildStats(tenantId));
        return response;
    }

    public TopologyDetailResponse detail(String tenantId, String id) {
        TopologyEntity topology = require(tenantId, id);
        TopologyDetailResponse response = new TopologyDetailResponse();
        response.setTopology(toTopologyResponse(topology));
        response.setNodes(toNodeResponses(topologyNodeMapper.selectByTopologyId(tenantId, id)));
        response.setEdges(toEdgeResponses(topologyEdgeMapper.selectByTopologyId(tenantId, id)));
        return response;
    }

    @Transactional
    public TopologyResponse create(String tenantId, TopologySaveRequest request) {
        assertUnique(tenantId, null, request.getTopologyCode());
        long now = System.currentTimeMillis();
        TopologyEntity entity = new TopologyEntity();
        entity.setId(IdGenerator.nextId());
        entity.setTenantId(tenantId);
        fill(entity, request);
        entity.setCreatedAt(Long.valueOf(now));
        entity.setUpdatedAt(Long.valueOf(now));
        topologyMapper.insert(entity);
        return toTopologyResponse(entity);
    }

    @Transactional
    public TopologyResponse update(String tenantId, String id, TopologySaveRequest request) {
        TopologyEntity entity = require(tenantId, id);
        assertUnique(tenantId, id, request.getTopologyCode());
        fill(entity, request);
        entity.setUpdatedAt(Long.valueOf(System.currentTimeMillis()));
        topologyMapper.update(entity);
        return toTopologyResponse(require(tenantId, id));
    }

    @Transactional
    public TopologyDetailResponse saveCanvas(String tenantId, String topologyId, TopologyCanvasSaveRequest request) {
        require(tenantId, topologyId);
        topologyEdgeMapper.deleteByTopologyId(tenantId, topologyId);
        topologyNodeMapper.deleteByTopologyId(tenantId, topologyId);
        long now = System.currentTimeMillis();
        if (request != null && request.getNodes() != null) {
            for (TopologyNodeSaveRequest node : request.getNodes()) {
                topologyNodeMapper.insert(toNodeEntity(tenantId, topologyId, node, now));
            }
        }
        if (request != null && request.getEdges() != null) {
            for (TopologyEdgeSaveRequest edge : request.getEdges()) {
                topologyEdgeMapper.insert(toEdgeEntity(tenantId, topologyId, edge, now));
            }
        }
        TopologyEntity topology = require(tenantId, topologyId);
        topology.setUpdatedAt(Long.valueOf(now));
        topologyMapper.update(topology);
        return detail(tenantId, topologyId);
    }

    @Transactional
    public void delete(String tenantId, String id) {
        require(tenantId, id);
        topologyEdgeMapper.deleteByTopologyId(tenantId, id);
        topologyNodeMapper.deleteByTopologyId(tenantId, id);
        topologyMapper.deleteById(tenantId, id);
    }

    private void fill(TopologyEntity entity, TopologySaveRequest request) {
        entity.setTopologyCode(trim(request.getTopologyCode()));
        entity.setTopologyName(trim(request.getTopologyName()));
        entity.setEnvId(trim(request.getEnvId()));
        entity.setDescription(trim(request.getDescription()));
        entity.setCanvasConfigJson(trim(request.getCanvasConfigJson()));
    }

    private TopologyNodeEntity toNodeEntity(String tenantId, String topologyId, TopologyNodeSaveRequest request, long now) {
        TopologyNodeEntity entity = new TopologyNodeEntity();
        entity.setId(defaultText(request.getId(), IdGenerator.nextId()));
        entity.setTenantId(tenantId);
        entity.setTopologyId(topologyId);
        entity.setNodeKey(trim(request.getNodeKey()));
        entity.setNodeName(trim(request.getNodeName()));
        entity.setNodeType(defaultText(request.getNodeType(), "RESOURCE"));
        entity.setObjectType(trim(request.getObjectType()));
        entity.setObjectId(trim(request.getObjectId()));
        entity.setObjectCode(trim(request.getObjectCode()));
        entity.setObjectName(trim(request.getObjectName()));
        entity.setX(defaultDouble(request.getX(), 100D));
        entity.setY(defaultDouble(request.getY(), 100D));
        entity.setWidth(defaultDouble(request.getWidth(), 180D));
        entity.setHeight(defaultDouble(request.getHeight(), 82D));
        entity.setStyleJson(trim(request.getStyleJson()));
        entity.setMetricDisplayJson(trim(request.getMetricDisplayJson()));
        entity.setHidden(request.getHidden() == null ? Boolean.FALSE : request.getHidden());
        entity.setGroupKey(trim(request.getGroupKey()));
        entity.setCreatedAt(Long.valueOf(now));
        entity.setUpdatedAt(Long.valueOf(now));
        return entity;
    }

    private TopologyEdgeEntity toEdgeEntity(String tenantId, String topologyId, TopologyEdgeSaveRequest request, long now) {
        TopologyEdgeEntity entity = new TopologyEdgeEntity();
        entity.setId(defaultText(request.getId(), IdGenerator.nextId()));
        entity.setTenantId(tenantId);
        entity.setTopologyId(topologyId);
        entity.setEdgeKey(trim(request.getEdgeKey()));
        entity.setEdgeName(defaultText(request.getEdgeName(), request.getEdgeKey()));
        entity.setEdgeType(defaultText(request.getEdgeType(), "DATA_FLOW"));
        entity.setSourceNodeId(trim(request.getSourceNodeId()));
        entity.setTargetNodeId(trim(request.getTargetNodeId()));
        entity.setSourceObjectType(trim(request.getSourceObjectType()));
        entity.setSourceObjectId(trim(request.getSourceObjectId()));
        entity.setTargetObjectType(trim(request.getTargetObjectType()));
        entity.setTargetObjectId(trim(request.getTargetObjectId()));
        entity.setRelationType(defaultText(request.getRelationType(), "MANUAL"));
        entity.setRelationId(trim(request.getRelationId()));
        entity.setPathJson(trim(request.getPathJson()));
        entity.setLabelPositionJson(trim(request.getLabelPositionJson()));
        entity.setStyleJson(trim(request.getStyleJson()));
        entity.setMetricDisplayJson(trim(request.getMetricDisplayJson()));
        entity.setHidden(request.getHidden() == null ? Boolean.FALSE : request.getHidden());
        entity.setCreatedAt(Long.valueOf(now));
        entity.setUpdatedAt(Long.valueOf(now));
        return entity;
    }

    private TopologyEntity require(String tenantId, String id) {
        TopologyEntity entity = topologyMapper.selectById(tenantId, id);
        if (entity == null) {
            throw new BusinessException(ErrorCode.RESOURCE_NOT_FOUND, "topology.not.found");
        }
        return entity;
    }

    private void assertUnique(String tenantId, String currentId, String code) {
        TopologyEntity entity = topologyMapper.selectByCode(tenantId, trim(code));
        if (entity != null && !entity.getId().equals(currentId)) {
            throw new BusinessException(ErrorCode.CONFLICT, "topology.code.exists");
        }
    }

    private List<TopologyResponse> toTopologyResponses(List<TopologyEntity> rows) {
        List<TopologyResponse> responses = new ArrayList<TopologyResponse>();
        for (TopologyEntity row : rows) { responses.add(toTopologyResponse(row)); }
        return responses;
    }

    private TopologyResponse toTopologyResponse(TopologyEntity entity) {
        TopologyResponse response = new TopologyResponse();
        response.setId(entity.getId());
        response.setTopologyCode(entity.getTopologyCode());
        response.setTopologyName(entity.getTopologyName());
        response.setEnvId(entity.getEnvId());
        response.setDescription(entity.getDescription());
        response.setCanvasConfigJson(entity.getCanvasConfigJson());
        response.setNodeCount(Long.valueOf(topologyNodeMapper.countByTopologyId(entity.getTenantId(), entity.getId())));
        response.setEdgeCount(Long.valueOf(topologyEdgeMapper.countByTopologyId(entity.getTenantId(), entity.getId())));
        response.setAlertLevel("NORMAL");
        response.setCreatedAt(entity.getCreatedAt());
        response.setUpdatedAt(entity.getUpdatedAt());
        return response;
    }

    private List<TopologyNodeResponse> toNodeResponses(List<TopologyNodeEntity> rows) {
        List<TopologyNodeResponse> responses = new ArrayList<TopologyNodeResponse>();
        for (TopologyNodeEntity entity : rows) {
            TopologyNodeResponse response = new TopologyNodeResponse();
            response.setId(entity.getId());
            response.setNodeKey(entity.getNodeKey());
            response.setNodeName(entity.getNodeName());
            response.setNodeType(entity.getNodeType());
            response.setObjectType(entity.getObjectType());
            response.setObjectId(entity.getObjectId());
            response.setObjectCode(entity.getObjectCode());
            response.setObjectName(entity.getObjectName());
            response.setX(entity.getX());
            response.setY(entity.getY());
            response.setWidth(entity.getWidth());
            response.setHeight(entity.getHeight());
            response.setStyleJson(entity.getStyleJson());
            response.setMetricDisplayJson(entity.getMetricDisplayJson());
            response.setHidden(entity.getHidden());
            response.setGroupKey(entity.getGroupKey());
            response.setAlertLevel("NORMAL");
            response.setAlertStatus("NORMAL");
            responses.add(response);
        }
        return responses;
    }

    private List<TopologyEdgeResponse> toEdgeResponses(List<TopologyEdgeEntity> rows) {
        List<TopologyEdgeResponse> responses = new ArrayList<TopologyEdgeResponse>();
        for (TopologyEdgeEntity entity : rows) {
            TopologyEdgeResponse response = new TopologyEdgeResponse();
            response.setId(entity.getId());
            response.setEdgeKey(entity.getEdgeKey());
            response.setEdgeName(entity.getEdgeName());
            response.setEdgeType(entity.getEdgeType());
            response.setSourceNodeId(entity.getSourceNodeId());
            response.setTargetNodeId(entity.getTargetNodeId());
            response.setRelationType(entity.getRelationType());
            response.setRelationId(entity.getRelationId());
            response.setSourceObjectType(entity.getSourceObjectType());
            response.setSourceObjectId(entity.getSourceObjectId());
            response.setTargetObjectType(entity.getTargetObjectType());
            response.setTargetObjectId(entity.getTargetObjectId());
            response.setPathJson(entity.getPathJson());
            response.setLabelPositionJson(entity.getLabelPositionJson());
            response.setStyleJson(entity.getStyleJson());
            response.setMetricDisplayJson(entity.getMetricDisplayJson());
            response.setHidden(entity.getHidden());
            response.setAlertLevel("NORMAL");
            response.setAlertStatus("NORMAL");
            responses.add(response);
        }
        return responses;
    }

    private List<StatCard> buildStats(String tenantId) {
        List<StatCard> stats = new ArrayList<StatCard>();
        stats.add(new StatCard("拓扑图", String.valueOf(topologyMapper.countAll(tenantId)), "已维护的数据流视图"));
        stats.add(new StatCard("拓扑节点", String.valueOf(topologyNodeMapper.countAll(tenantId)), "画布中的资源节点"));
        stats.add(new StatCard("拓扑连线", String.valueOf(topologyEdgeMapper.countAll(tenantId)), "画布中的数据流关系"));
        stats.add(new StatCard("异常元素", "0", "当前告警影响的节点或连线"));
        return stats;
    }

    private int positive(Integer value, int defaultValue) { return value == null || value.intValue() <= 0 ? defaultValue : value.intValue(); }
    private int bounded(Integer value, int defaultValue, int max) { return Math.min(positive(value, defaultValue), max); }
    private Double defaultDouble(Double value, Double defaultValue) { return value == null ? defaultValue : value; }
    private String defaultText(String value, String defaultValue) { String text = trim(value); return text.length() == 0 ? defaultValue : text; }
    private String trim(String value) { return value == null ? "" : value.trim(); }

}
