package com.flowpulse.resource.infrastructure.persistence.mapper;

import com.flowpulse.resource.domain.model.LogicalObjectInstanceEntity;
import org.apache.ibatis.annotations.Param;

import java.util.List;

public interface LogicalObjectInstanceMapper {
    List<LogicalObjectInstanceEntity> selectPage(@Param("tenantId") String tenantId,
                                                 @Param("logicalObjectId") String logicalObjectId,
                                                 @Param("keyword") String keyword,
                                                 @Param("status") String status,
                                                 @Param("offset") int offset,
                                                 @Param("pageSize") int pageSize);

    long countPage(@Param("tenantId") String tenantId,
                   @Param("logicalObjectId") String logicalObjectId,
                   @Param("keyword") String keyword,
                   @Param("status") String status);

    LogicalObjectInstanceEntity selectByPhysicalKey(@Param("tenantId") String tenantId,
                                                    @Param("logicalObjectId") String logicalObjectId,
                                                    @Param("physicalObjectType") String physicalObjectType,
                                                    @Param("physicalObjectCode") String physicalObjectCode);

    int insert(LogicalObjectInstanceEntity entity);

    int update(LogicalObjectInstanceEntity entity);

    int deleteByLogicalObjectId(@Param("tenantId") String tenantId, @Param("logicalObjectId") String logicalObjectId);
}
