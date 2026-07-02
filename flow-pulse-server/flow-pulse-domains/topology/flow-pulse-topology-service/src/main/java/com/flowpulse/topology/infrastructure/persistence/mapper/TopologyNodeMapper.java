package com.flowpulse.topology.infrastructure.persistence.mapper;

import com.flowpulse.topology.domain.model.TopologyNodeEntity;
import org.apache.ibatis.annotations.Param;

import java.util.List;

public interface TopologyNodeMapper {
    TopologyNodeEntity selectById(@Param("tenantId") String tenantId, @Param("id") String id);
    List<TopologyNodeEntity> selectByTopologyId(@Param("tenantId") String tenantId, @Param("topologyId") String topologyId);
    long countAll(@Param("tenantId") String tenantId);
    void insert(TopologyNodeEntity entity);
    void deleteByTopologyId(@Param("tenantId") String tenantId, @Param("topologyId") String topologyId);
}
