package com.flowpulse.metric.infrastructure.persistence.mapper;

import com.flowpulse.metric.domain.model.MetricDefinitionEntity;
import org.apache.ibatis.annotations.Param;

import java.util.List;

public interface MetricDefinitionMapper {
    List<MetricDefinitionEntity> selectPage(@Param("tenantId") String tenantId,
                                            @Param("keyword") String keyword,
                                            @Param("metricCategory") String metricCategory,
                                            @Param("objectType") String objectType,
                                            @Param("enabled") Boolean enabled,
                                            @Param("offset") int offset,
                                            @Param("limit") int limit);

    long countPage(@Param("tenantId") String tenantId,
                   @Param("keyword") String keyword,
                   @Param("metricCategory") String metricCategory,
                   @Param("objectType") String objectType,
                   @Param("enabled") Boolean enabled);

    long countAll(@Param("tenantId") String tenantId);

    long countEnabled(@Param("tenantId") String tenantId);

    long countMapped(@Param("tenantId") String tenantId);

    long countObjectTypes(@Param("tenantId") String tenantId);

    MetricDefinitionEntity selectById(@Param("tenantId") String tenantId, @Param("id") String id);

    MetricDefinitionEntity selectByCode(@Param("tenantId") String tenantId, @Param("metricCode") String metricCode);

    int insert(MetricDefinitionEntity entity);

    int update(MetricDefinitionEntity entity);

    int deleteById(@Param("tenantId") String tenantId, @Param("id") String id);
}
