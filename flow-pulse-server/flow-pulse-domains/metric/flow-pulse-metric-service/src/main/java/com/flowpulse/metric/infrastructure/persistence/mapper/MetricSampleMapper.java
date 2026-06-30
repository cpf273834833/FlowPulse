package com.flowpulse.metric.infrastructure.persistence.mapper;

import com.flowpulse.metric.domain.model.MetricSampleEntity;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

@Mapper
public interface MetricSampleMapper {
    int insert(MetricSampleEntity entity);

    MetricSampleEntity selectLatestByConfigId(@Param("tenantId") String tenantId, @Param("configId") String configId);
}
