package com.flowpulse.management.infrastructure.persistence.mapper;

import com.flowpulse.management.domain.model.RegionEntity;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import java.util.List;

@Mapper
public interface RegionMapper {
    List<RegionEntity> selectAll(@Param("tenantId") String tenantId);
    RegionEntity selectById(@Param("tenantId") String tenantId, @Param("id") String id);
    RegionEntity selectByCode(@Param("tenantId") String tenantId, @Param("envId") String envId, @Param("regionCode") String regionCode);
    List<RegionEntity> selectByEnvId(@Param("tenantId") String tenantId, @Param("envId") String envId);
    int countChildren(@Param("tenantId") String tenantId, @Param("parentRegionId") String parentRegionId);
    int insert(RegionEntity entity);
    int update(RegionEntity entity);
    int deleteById(@Param("tenantId") String tenantId, @Param("id") String id);
}
