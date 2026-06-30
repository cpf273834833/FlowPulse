package com.flowpulse.metric.infrastructure.persistence.mapper;

import com.flowpulse.metric.domain.model.ThresholdRuleEntity;
import org.apache.ibatis.annotations.Param;

import java.util.List;

public interface ThresholdRuleMapper {
    ThresholdRuleEntity selectById(@Param("tenantId") String tenantId, @Param("id") String id);

    ThresholdRuleEntity selectByCode(@Param("tenantId") String tenantId, @Param("ruleCode") String ruleCode);

    List<ThresholdRuleEntity> selectPage(@Param("tenantId") String tenantId,
                                         @Param("keyword") String keyword,
                                         @Param("metricDefinitionId") String metricDefinitionId,
                                         @Param("scopeType") String scopeType,
                                         @Param("objectType") String objectType,
                                         @Param("objectId") String objectId,
                                         @Param("enabled") Boolean enabled,
                                         @Param("offset") int offset,
                                         @Param("limit") int limit);

    long countPage(@Param("tenantId") String tenantId,
                   @Param("keyword") String keyword,
                   @Param("metricDefinitionId") String metricDefinitionId,
                   @Param("scopeType") String scopeType,
                   @Param("objectType") String objectType,
                   @Param("objectId") String objectId,
                   @Param("enabled") Boolean enabled);

    long countAll(@Param("tenantId") String tenantId);

    long countEnabled(@Param("tenantId") String tenantId);

    long countScope(@Param("tenantId") String tenantId, @Param("scopeType") String scopeType);

    List<ThresholdRuleEntity> selectEnabledResourceRules(@Param("tenantId") String tenantId,
                                                         @Param("metricDefinitionId") String metricDefinitionId,
                                                         @Param("objectType") String objectType,
                                                         @Param("objectId") String objectId);

    void insert(ThresholdRuleEntity entity);

    void update(ThresholdRuleEntity entity);

    void deleteById(@Param("tenantId") String tenantId, @Param("id") String id);
}
