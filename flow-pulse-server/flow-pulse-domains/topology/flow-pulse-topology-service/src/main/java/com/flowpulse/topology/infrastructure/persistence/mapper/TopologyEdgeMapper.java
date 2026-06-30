package com.flowpulse.topology.infrastructure.persistence.mapper;

import com.flowpulse.topology.domain.model.TopologyEdgeEntity;
import org.apache.ibatis.annotations.Param;

import java.util.List;

public interface TopologyEdgeMapper {
    List<TopologyEdgeEntity> selectByTopologyId(@Param("tenantId") String tenantId, @Param("topologyId") String topologyId);
    long countAll(@Param("tenantId") String tenantId);
    void insert(TopologyEdgeEntity entity);
    void deleteByTopologyId(@Param("tenantId") String tenantId, @Param("topologyId") String topologyId);
}
