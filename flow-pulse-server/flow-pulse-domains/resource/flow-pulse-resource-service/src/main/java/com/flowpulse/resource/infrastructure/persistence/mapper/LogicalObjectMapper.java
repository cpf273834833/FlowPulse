package com.flowpulse.resource.infrastructure.persistence.mapper;

import com.flowpulse.resource.domain.model.LogicalObjectEntity;
import org.apache.ibatis.annotations.Param;

import java.util.List;

public interface LogicalObjectMapper {
    List<LogicalObjectEntity> selectPage(@Param("tenantId") String tenantId, @Param("keyword") String keyword,
                                         @Param("envId") String envId, @Param("regionId") String regionId,
                                         @Param("objectType") String objectType, @Param("sourceType") String sourceType,
                                         @Param("enabled") Boolean enabled, @Param("offset") int offset,
                                         @Param("pageSize") int pageSize);

    long countPage(@Param("tenantId") String tenantId, @Param("keyword") String keyword,
                   @Param("envId") String envId, @Param("regionId") String regionId,
                   @Param("objectType") String objectType, @Param("sourceType") String sourceType,
                   @Param("enabled") Boolean enabled);

    LogicalObjectEntity selectById(@Param("tenantId") String tenantId, @Param("id") String id);

    LogicalObjectEntity selectByCode(@Param("tenantId") String tenantId, @Param("objectCode") String objectCode);

    int insert(LogicalObjectEntity entity);

    int update(LogicalObjectEntity entity);

    int delete(@Param("tenantId") String tenantId, @Param("id") String id);
}
