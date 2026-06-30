package com.flowpulse.management.infrastructure.persistence.mapper;

import com.flowpulse.management.domain.model.PlatformConfigEntity;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import java.util.List;

@Mapper
public interface PlatformConfigMapper {
    List<PlatformConfigEntity> selectAll(@Param("tenantId") String tenantId);
    PlatformConfigEntity selectById(@Param("tenantId") String tenantId, @Param("id") String id);
    PlatformConfigEntity selectByRegionId(@Param("tenantId") String tenantId, @Param("regionId") String regionId);
    int insert(PlatformConfigEntity entity);
    int update(PlatformConfigEntity entity);
    int deleteById(@Param("tenantId") String tenantId, @Param("id") String id);
}
