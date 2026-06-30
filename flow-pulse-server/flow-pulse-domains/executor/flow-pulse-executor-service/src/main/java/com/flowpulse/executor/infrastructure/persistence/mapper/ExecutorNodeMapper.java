package com.flowpulse.executor.infrastructure.persistence.mapper;

import com.flowpulse.executor.domain.model.ExecutorNodeEntity;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import java.util.List;

@Mapper
public interface ExecutorNodeMapper {
    List<ExecutorNodeEntity> selectPage(@Param("tenantId") String tenantId,
                                        @Param("keyword") String keyword,
                                        @Param("envId") String envId,
                                        @Param("regionId") String regionId,
                                        @Param("sourceType") String sourceType,
                                        @Param("connectionStatus") String connectionStatus,
                                        @Param("offset") int offset,
                                        @Param("limit") int limit);

    long countPage(@Param("tenantId") String tenantId,
                   @Param("keyword") String keyword,
                   @Param("envId") String envId,
                   @Param("regionId") String regionId,
                   @Param("sourceType") String sourceType,
                   @Param("connectionStatus") String connectionStatus);

    long countAll(@Param("tenantId") String tenantId);

    long countBySshSupported(@Param("tenantId") String tenantId);

    long countByAgentSupported(@Param("tenantId") String tenantId);

    long countBySourceType(@Param("tenantId") String tenantId, @Param("sourceType") String sourceType);

    ExecutorNodeEntity selectById(@Param("tenantId") String tenantId, @Param("id") String id);

    ExecutorNodeEntity selectByHost(@Param("tenantId") String tenantId,
                                    @Param("envId") String envId,
                                    @Param("regionId") String regionId,
                                    @Param("host") String host);

    int insert(ExecutorNodeEntity entity);

    int update(ExecutorNodeEntity entity);

    int deleteById(@Param("tenantId") String tenantId, @Param("id") String id);
}
