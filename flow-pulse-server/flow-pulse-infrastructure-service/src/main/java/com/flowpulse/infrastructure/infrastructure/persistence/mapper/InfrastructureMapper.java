package com.flowpulse.infrastructure.infrastructure.persistence.mapper;

import com.flowpulse.infrastructure.domain.model.InfrastructureEntity;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import java.util.List;

@Mapper
public interface InfrastructureMapper {
    List<InfrastructureEntity> selectPage(@Param("tenantId") String tenantId, @Param("keyword") String keyword,
                                          @Param("type") String type, @Param("envId") String envId,
                                          @Param("regionId") String regionId, @Param("status") String status,
                                          @Param("offset") int offset, @Param("limit") int limit);
    long countPage(@Param("tenantId") String tenantId, @Param("keyword") String keyword,
                   @Param("type") String type, @Param("envId") String envId,
                   @Param("regionId") String regionId, @Param("status") String status);
    List<InfrastructureEntity> selectAll(@Param("tenantId") String tenantId);
    InfrastructureEntity selectById(@Param("tenantId") String tenantId, @Param("id") String id);
    InfrastructureEntity selectByCode(@Param("tenantId") String tenantId, @Param("code") String code);
    int insert(InfrastructureEntity entity);
    int update(InfrastructureEntity entity);
    int updateRuntime(InfrastructureEntity entity);
    int deleteById(@Param("tenantId") String tenantId, @Param("id") String id);
}
