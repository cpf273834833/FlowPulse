package com.flowpulse.metric.infrastructure.persistence.mapper;

import com.flowpulse.metric.domain.model.MetricApplicabilityEntity;
import com.flowpulse.metric.domain.model.MetricDefinitionEntity;
import org.apache.ibatis.annotations.Param;

import java.util.List;

public interface MetricApplicabilityMapper {
    List<MetricApplicabilityEntity> selectByMetricIds(@Param("tenantId") String tenantId,
                                                      @Param("metricIds") List<String> metricIds);

    List<MetricDefinitionEntity> selectApplicableMetrics(@Param("tenantId") String tenantId,
                                                         @Param("scopeType") String scopeType,
                                                         @Param("objectType") String objectType,
                                                         @Param("relationType") String relationType,
                                                         @Param("sourceObjectType") String sourceObjectType,
                                                         @Param("targetObjectType") String targetObjectType,
                                                         @Param("enabled") Boolean enabled);

    int insert(MetricApplicabilityEntity entity);

    int deleteByMetricDefinitionId(@Param("tenantId") String tenantId,
                                   @Param("metricDefinitionId") String metricDefinitionId);
}
