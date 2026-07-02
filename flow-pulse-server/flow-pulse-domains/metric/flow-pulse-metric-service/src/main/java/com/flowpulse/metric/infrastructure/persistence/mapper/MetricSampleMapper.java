package com.flowpulse.metric.infrastructure.persistence.mapper;

import com.flowpulse.metric.domain.model.MetricSampleEntity;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import java.util.List;

@Mapper
public interface MetricSampleMapper {
    int insert(MetricSampleEntity entity);

    MetricSampleEntity selectLatestByConfigId(@Param("tenantId") String tenantId, @Param("configId") String configId);

    List<MetricSampleEntity> selectLatestSeriesByConfigId(@Param("tenantId") String tenantId, @Param("configId") String configId);

    MetricSampleEntity selectLatestByMetricObjectSeries(@Param("tenantId") String tenantId,
                                                        @Param("metricCode") String metricCode,
                                                        @Param("objectType") String objectType,
                                                        @Param("objectId") String objectId,
                                                        @Param("instance") String instance,
                                                        @Param("seriesType") String seriesType);

    MetricSampleEntity selectPreviousByMetricObjectSeries(@Param("tenantId") String tenantId,
                                                          @Param("metricCode") String metricCode,
                                                          @Param("objectType") String objectType,
                                                          @Param("objectId") String objectId,
                                                          @Param("instance") String instance,
                                                          @Param("seriesType") String seriesType,
                                                          @Param("beforeAt") Long beforeAt);

    List<MetricSampleEntity> selectLatestSeriesByMetricObject(@Param("tenantId") String tenantId,
                                                              @Param("metricCode") String metricCode,
                                                              @Param("objectType") String objectType,
                                                              @Param("objectId") String objectId);
}
