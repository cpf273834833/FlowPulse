package com.flowpulse.metric.infrastructure.persistence.mapper;

import com.flowpulse.metric.domain.model.MetricCollectRecordEntity;
import org.apache.ibatis.annotations.Mapper;

@Mapper
public interface MetricCollectRecordMapper {
    int insert(MetricCollectRecordEntity entity);
}
