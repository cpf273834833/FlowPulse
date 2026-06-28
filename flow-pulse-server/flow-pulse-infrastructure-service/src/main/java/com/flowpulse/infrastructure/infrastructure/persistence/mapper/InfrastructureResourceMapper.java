package com.flowpulse.infrastructure.infrastructure.persistence.mapper;

import com.flowpulse.infrastructure.domain.model.InfrastructureResourceEntity;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import java.util.List;

@Mapper
public interface InfrastructureResourceMapper {
    List<InfrastructureResourceEntity> selectPage(@Param("tenantId") String tenantId, @Param("infrastructureId") String infrastructureId,
                                                  @Param("keyword") String keyword, @Param("resourceType") String resourceType,
                                                  @Param("offset") int offset, @Param("limit") int limit);
    long countPage(@Param("tenantId") String tenantId, @Param("infrastructureId") String infrastructureId,
                   @Param("keyword") String keyword, @Param("resourceType") String resourceType);
    int countByInfrastructureId(@Param("tenantId") String tenantId, @Param("infrastructureId") String infrastructureId);
    int deleteByInfrastructureId(@Param("tenantId") String tenantId, @Param("infrastructureId") String infrastructureId);
    int deleteNotSyncedAt(@Param("tenantId") String tenantId, @Param("infrastructureId") String infrastructureId,
                          @Param("lastSyncAt") long lastSyncAt);
    int upsert(InfrastructureResourceEntity entity);
}
