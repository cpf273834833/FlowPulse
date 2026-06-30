package com.flowpulse.metric.infrastructure.persistence.mapper;

import com.flowpulse.metric.domain.model.MetricImplementationEntity;
import org.apache.ibatis.annotations.Param;

import java.util.List;

public interface MetricImplementationMapper {
    List<MetricImplementationEntity> selectPage(@Param("tenantId") String tenantId,
                                                @Param("keyword") String keyword,
                                                @Param("metricDefinitionId") String metricDefinitionId,
                                                @Param("implementationType") String implementationType,
                                                @Param("enabled") Boolean enabled,
                                                @Param("offset") int offset,
                                                @Param("limit") int limit);

    long countPage(@Param("tenantId") String tenantId,
                   @Param("keyword") String keyword,
                   @Param("metricDefinitionId") String metricDefinitionId,
                   @Param("implementationType") String implementationType,
                   @Param("enabled") Boolean enabled);

    long countAll(@Param("tenantId") String tenantId);

    long countEnabled(@Param("tenantId") String tenantId);

    long countDefault(@Param("tenantId") String tenantId);

    long countScript(@Param("tenantId") String tenantId);

    MetricImplementationEntity selectById(@Param("tenantId") String tenantId, @Param("id") String id);

    MetricImplementationEntity selectByCode(@Param("tenantId") String tenantId, @Param("implementationCode") String implementationCode);

    MetricImplementationEntity selectDefaultByMetric(@Param("tenantId") String tenantId, @Param("metricDefinitionId") String metricDefinitionId);

    int clearDefault(@Param("tenantId") String tenantId, @Param("metricDefinitionId") String metricDefinitionId, @Param("excludeId") String excludeId);

    int insert(MetricImplementationEntity entity);

    int update(MetricImplementationEntity entity);

    int deleteById(@Param("tenantId") String tenantId, @Param("id") String id);
}
