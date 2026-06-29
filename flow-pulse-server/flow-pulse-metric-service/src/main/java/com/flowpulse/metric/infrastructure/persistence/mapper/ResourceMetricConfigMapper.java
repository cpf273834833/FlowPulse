package com.flowpulse.metric.infrastructure.persistence.mapper;

import com.flowpulse.metric.domain.model.ResourceMetricConfigEntity;
import org.apache.ibatis.annotations.Param;

import java.util.List;

public interface ResourceMetricConfigMapper {
    List<ResourceMetricConfigEntity> selectPage(@Param("tenantId") String tenantId,
                                                @Param("keyword") String keyword,
                                                @Param("objectType") String objectType,
                                                @Param("objectId") String objectId,
                                                @Param("infrastructureId") String infrastructureId,
                                                @Param("envId") String envId,
                                                @Param("regionId") String regionId,
                                                @Param("metricDefinitionId") String metricDefinitionId,
                                                @Param("enabled") Boolean enabled,
                                                @Param("offset") int offset,
                                                @Param("limit") int limit);

    long countPage(@Param("tenantId") String tenantId,
                   @Param("keyword") String keyword,
                   @Param("objectType") String objectType,
                   @Param("objectId") String objectId,
                   @Param("infrastructureId") String infrastructureId,
                   @Param("envId") String envId,
                   @Param("regionId") String regionId,
                   @Param("metricDefinitionId") String metricDefinitionId,
                   @Param("enabled") Boolean enabled);

    long countAll(@Param("tenantId") String tenantId);

    long countEnabled(@Param("tenantId") String tenantId);

    long countError(@Param("tenantId") String tenantId);

    long countObjects(@Param("tenantId") String tenantId);

    ResourceMetricConfigEntity selectById(@Param("tenantId") String tenantId, @Param("id") String id);

    ResourceMetricConfigEntity selectByObjectMetric(@Param("tenantId") String tenantId,
                                                    @Param("objectType") String objectType,
                                                    @Param("objectId") String objectId,
                                                    @Param("metricDefinitionId") String metricDefinitionId);

    int insert(ResourceMetricConfigEntity entity);

    int update(ResourceMetricConfigEntity entity);

    int deleteById(@Param("tenantId") String tenantId, @Param("id") String id);
}
