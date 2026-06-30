package com.flowpulse.management.infrastructure.persistence.mapper;

import com.flowpulse.management.domain.model.EnvironmentEntity;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import java.util.List;

@Mapper
public interface EnvironmentMapper {
    List<EnvironmentEntity> selectAll(@Param("tenantId") String tenantId);
    EnvironmentEntity selectById(@Param("tenantId") String tenantId, @Param("id") String id);
    EnvironmentEntity selectByCode(@Param("tenantId") String tenantId, @Param("envCode") String envCode);
    int insert(EnvironmentEntity entity);
    int update(EnvironmentEntity entity);
    int deleteById(@Param("tenantId") String tenantId, @Param("id") String id);
}
