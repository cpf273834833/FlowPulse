package com.flowpulse.alert.infrastructure.persistence.mapper;

import com.flowpulse.alert.domain.model.NotificationChannelEntity;
import org.apache.ibatis.annotations.Param;

import java.util.List;

public interface NotificationChannelMapper {
    List<NotificationChannelEntity> selectAll(@Param("tenantId") String tenantId);
    NotificationChannelEntity selectById(@Param("tenantId") String tenantId, @Param("id") String id);
    NotificationChannelEntity selectByCode(@Param("tenantId") String tenantId, @Param("channelCode") String channelCode);
    void insert(NotificationChannelEntity entity);
    void update(NotificationChannelEntity entity);
    void deleteById(@Param("tenantId") String tenantId, @Param("id") String id);
}
