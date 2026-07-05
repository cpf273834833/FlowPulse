package com.flowpulse.topology.infrastructure.persistence.mapper;

import com.flowpulse.topology.domain.model.TopologyEdgeEntity;
import org.apache.ibatis.annotations.Param;

import java.util.List;

public interface TopologyEdgeMapper {
    TopologyEdgeEntity selectById(@Param("tenantId") String tenantId, @Param("id") String id);
    List<TopologyEdgeEntity> selectByTopologyId(@Param("tenantId") String tenantId, @Param("topologyId") String topologyId);
    long countAll(@Param("tenantId") String tenantId);
    long countByTopologyId(@Param("tenantId") String tenantId, @Param("topologyId") String topologyId);
    void insert(TopologyEdgeEntity entity);
    void deleteByTopologyId(@Param("tenantId") String tenantId, @Param("topologyId") String topologyId);
}
