package com.flowpulse.topology.infrastructure.persistence.mapper;

import com.flowpulse.topology.domain.model.TopologyEntity;
import org.apache.ibatis.annotations.Param;

import java.util.List;

public interface TopologyMapper {
    TopologyEntity selectById(@Param("tenantId") String tenantId, @Param("id") String id);
    TopologyEntity selectByCode(@Param("tenantId") String tenantId, @Param("topologyCode") String topologyCode);
    List<TopologyEntity> selectPage(@Param("tenantId") String tenantId, @Param("keyword") String keyword,
                                    @Param("envId") String envId, @Param("offset") int offset, @Param("limit") int limit);
    long countPage(@Param("tenantId") String tenantId, @Param("keyword") String keyword, @Param("envId") String envId);
    long countAll(@Param("tenantId") String tenantId);
    void insert(TopologyEntity entity);
    void update(TopologyEntity entity);
    void deleteById(@Param("tenantId") String tenantId, @Param("id") String id);
}
