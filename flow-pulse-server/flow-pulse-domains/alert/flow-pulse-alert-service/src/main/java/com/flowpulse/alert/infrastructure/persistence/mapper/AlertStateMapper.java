package com.flowpulse.alert.infrastructure.persistence.mapper;

import com.flowpulse.alert.domain.model.AlertStateEntity;
import org.apache.ibatis.annotations.Param;

import java.util.List;

public interface AlertStateMapper {
    AlertStateEntity selectById(@Param("tenantId") String tenantId, @Param("id") String id);
    AlertStateEntity selectByAlertKey(@Param("tenantId") String tenantId, @Param("alertKey") String alertKey);
    List<AlertStateEntity> selectPage(@Param("tenantId") String tenantId, @Param("keyword") String keyword,
                                      @Param("level") String level, @Param("status") String status,
                                      @Param("objectType") String objectType, @Param("topologyId") String topologyId,
                                      @Param("topologyElementId") String topologyElementId,
                                      @Param("offset") int offset, @Param("limit") int limit);
    long countPage(@Param("tenantId") String tenantId, @Param("keyword") String keyword,
                   @Param("level") String level, @Param("status") String status,
                   @Param("objectType") String objectType, @Param("topologyId") String topologyId,
                   @Param("topologyElementId") String topologyElementId);
    long countAll(@Param("tenantId") String tenantId);
    long countByStatus(@Param("tenantId") String tenantId, @Param("status") String status);
    long countByLevel(@Param("tenantId") String tenantId, @Param("level") String level);
    void insert(AlertStateEntity entity);
    void update(AlertStateEntity entity);
    void acknowledge(@Param("tenantId") String tenantId, @Param("id") String id,
                     @Param("operator") String operator, @Param("now") long now);
}
