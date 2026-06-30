package com.flowpulse.alert.infrastructure.persistence.mapper;

import com.flowpulse.alert.domain.model.AlertEventEntity;
import org.apache.ibatis.annotations.Param;

import java.util.List;

public interface AlertEventMapper {
    List<AlertEventEntity> selectByAlertStateId(@Param("tenantId") String tenantId, @Param("alertStateId") String alertStateId);

    void insert(AlertEventEntity entity);
}
