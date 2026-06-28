package com.flowpulse.management.application;

import com.flowpulse.common.BusinessException;
import com.flowpulse.common.ErrorCode;
import com.flowpulse.common.IdGenerator;
import com.flowpulse.common.MessageKeys;
import com.flowpulse.common.StatCard;
import com.flowpulse.management.api.request.EnvironmentSaveRequest;
import com.flowpulse.management.api.request.PlatformConfigSaveRequest;
import com.flowpulse.management.api.request.RegionSaveRequest;
import com.flowpulse.management.api.response.EnvironmentRegionPageResponse;
import com.flowpulse.management.api.response.EnvironmentResponse;
import com.flowpulse.management.api.response.PlatformConfigResponse;
import com.flowpulse.management.api.response.RegionResponse;
import com.flowpulse.management.domain.model.EnvironmentEntity;
import com.flowpulse.management.domain.model.PlatformConfigEntity;
import com.flowpulse.management.domain.model.RegionEntity;
import com.flowpulse.management.infrastructure.persistence.mapper.EnvironmentMapper;
import com.flowpulse.management.infrastructure.persistence.mapper.PlatformConfigMapper;
import com.flowpulse.management.infrastructure.persistence.mapper.RegionMapper;
import org.springframework.context.MessageSource;
import org.springframework.context.i18n.LocaleContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
public class EnvironmentRegionService {
    private static final String REGION_MANAGEMENT = "MANAGEMENT";
    private static final String REGION_COMPUTE = "COMPUTE";
    private static final String STATUS_ENABLED = "ENABLED";
    private static final String AUTH_TYPE_API_KEY = "API_KEY";
    private static final String CONNECTION_UNKNOWN = "UNKNOWN";

    private final EnvironmentMapper environmentMapper;
    private final RegionMapper regionMapper;
    private final PlatformConfigMapper platformConfigMapper;
    private final MessageSource messageSource;

    public EnvironmentRegionService(EnvironmentMapper environmentMapper,
                                    RegionMapper regionMapper,
                                    PlatformConfigMapper platformConfigMapper,
                                    MessageSource messageSource) {
        this.environmentMapper = environmentMapper;
        this.regionMapper = regionMapper;
        this.platformConfigMapper = platformConfigMapper;
        this.messageSource = messageSource;
    }

    public EnvironmentRegionPageResponse page(String tenantId) {
        List<EnvironmentEntity> environments = environmentMapper.selectAll(tenantId);
        List<RegionEntity> regions = regionMapper.selectAll(tenantId);
        List<PlatformConfigEntity> platformConfigs = platformConfigMapper.selectAll(tenantId);
        Map<String, EnvironmentEntity> environmentIndex = indexEnvironments(environments);
        Map<String, RegionEntity> regionIndex = indexRegions(regions);

        EnvironmentRegionPageResponse response = new EnvironmentRegionPageResponse();
        response.setEnvironments(toEnvironmentResponses(environments));
        response.setRegions(toRegionResponses(regions, environmentIndex, regionIndex));
        response.setPlatformConfigs(toPlatformConfigResponses(platformConfigs, environmentIndex, regionIndex));
        response.setStats(buildStats(environments, regions, platformConfigs));
        return response;
    }

    @Transactional
    public EnvironmentResponse createEnvironment(String tenantId, EnvironmentSaveRequest request) {
        assertEnvironmentCodeUnique(tenantId, null, request.getEnvCode());
        long now = System.currentTimeMillis();
        EnvironmentEntity entity = new EnvironmentEntity();
        entity.setId(IdGenerator.nextId());
        entity.setTenantId(tenantId);
        entity.setEnvCode(trim(request.getEnvCode()));
        entity.setEnvName(trim(request.getEnvName()));
        entity.setDescription(trim(request.getDescription()));
        entity.setCreatedAt(now);
        entity.setUpdatedAt(now);
        environmentMapper.insert(entity);
        return toEnvironmentResponse(entity);
    }

    @Transactional
    public EnvironmentResponse updateEnvironment(String tenantId, String id, EnvironmentSaveRequest request) {
        EnvironmentEntity entity = requireEnvironment(tenantId, id);
        assertEnvironmentCodeUnique(tenantId, id, request.getEnvCode());
        entity.setEnvCode(trim(request.getEnvCode()));
        entity.setEnvName(trim(request.getEnvName()));
        entity.setDescription(trim(request.getDescription()));
        entity.setUpdatedAt(System.currentTimeMillis());
        environmentMapper.update(entity);
        return toEnvironmentResponse(entity);
    }

    @Transactional
    public void deleteEnvironment(String tenantId, String id) {
        requireEnvironment(tenantId, id);
        if (!regionMapper.selectByEnvId(tenantId, id).isEmpty()) {
            throw new BusinessException(ErrorCode.BUSINESS_RULE_VIOLATED, MessageKeys.ENVIRONMENT_DELETE_HAS_REGION);
        }
        environmentMapper.deleteById(tenantId, id);
    }

    @Transactional
    public RegionResponse createRegion(String tenantId, RegionSaveRequest request) {
        EnvironmentEntity environment = requireEnvironment(tenantId, request.getEnvId());
        String regionType = normalizedRegionType(request.getRegionType());
        assertRegionCodeUnique(tenantId, null, request.getEnvId(), request.getRegionCode());
        RegionEntity parent = validateParentRegion(tenantId, environment, regionType, request.getParentRegionId());
        long now = System.currentTimeMillis();
        RegionEntity entity = new RegionEntity();
        entity.setId(IdGenerator.nextId());
        entity.setTenantId(tenantId);
        entity.setEnvId(environment.getId());
        entity.setParentRegionId(parent == null ? null : parent.getId());
        entity.setRegionType(regionType);
        entity.setRegionCode(trim(request.getRegionCode()));
        entity.setRegionName(trim(request.getRegionName()));
        entity.setDescription(trim(request.getDescription()));
        entity.setCreatedAt(now);
        entity.setUpdatedAt(now);
        regionMapper.insert(entity);
        return toRegionResponse(entity, environment, parent);
    }

    @Transactional
    public RegionResponse updateRegion(String tenantId, String id, RegionSaveRequest request) {
        RegionEntity entity = requireRegion(tenantId, id);
        EnvironmentEntity environment = requireEnvironment(tenantId, request.getEnvId());
        String regionType = normalizedRegionType(request.getRegionType());
        assertRegionCodeUnique(tenantId, id, request.getEnvId(), request.getRegionCode());
        RegionEntity parent = validateParentRegion(tenantId, environment, regionType, request.getParentRegionId());
        entity.setEnvId(environment.getId());
        entity.setParentRegionId(parent == null ? null : parent.getId());
        entity.setRegionType(regionType);
        entity.setRegionCode(trim(request.getRegionCode()));
        entity.setRegionName(trim(request.getRegionName()));
        entity.setDescription(trim(request.getDescription()));
        entity.setUpdatedAt(System.currentTimeMillis());
        regionMapper.update(entity);
        return toRegionResponse(entity, environment, parent);
    }

    @Transactional
    public void deleteRegion(String tenantId, String id) {
        RegionEntity entity = requireRegion(tenantId, id);
        if (REGION_MANAGEMENT.equals(entity.getRegionType()) && regionMapper.countChildren(tenantId, id) > 0) {
            throw new BusinessException(ErrorCode.BUSINESS_RULE_VIOLATED, MessageKeys.REGION_DELETE_HAS_COMPUTE);
        }
        if (platformConfigMapper.selectByRegionId(tenantId, id) != null) {
            throw new BusinessException(ErrorCode.BUSINESS_RULE_VIOLATED, MessageKeys.REGION_DELETE_HAS_CONFIG);
        }
        regionMapper.deleteById(tenantId, id);
    }

    @Transactional
    public PlatformConfigResponse savePlatformConfig(String tenantId, PlatformConfigSaveRequest request) {
        RegionEntity region = requireRegion(tenantId, request.getRegionId());
        EnvironmentEntity environment = requireEnvironment(tenantId, region.getEnvId());
        PlatformConfigEntity existing = platformConfigMapper.selectByRegionId(tenantId, region.getId());
        long now = System.currentTimeMillis();
        PlatformConfigEntity entity = existing == null ? new PlatformConfigEntity() : existing;
        if (existing == null) {
            entity.setId(IdGenerator.nextId());
            entity.setTenantId(tenantId);
            entity.setEnvId(environment.getId());
            entity.setRegionId(region.getId());
            entity.setPlatformConnectionStatus(CONNECTION_UNKNOWN);
            entity.setOmpConnectionStatus(CONNECTION_UNKNOWN);
            entity.setCreatedAt(now);
        }
        entity.setName(defaultText(request.getName(), message(MessageKeys.PLATFORM_CONFIG_DEFAULT_NAME, region.getRegionName())));
        entity.setPlatformBaseUrl(trim(request.getPlatformBaseUrl()));
        entity.setOmpBaseUrl(trim(request.getOmpBaseUrl()));
        entity.setPlatformAuthType(defaultText(request.getPlatformAuthType(), AUTH_TYPE_API_KEY));
        entity.setPlatformApiKey(trim(request.getPlatformApiKey()));
        entity.setOmpAuthType(defaultText(request.getOmpAuthType(), AUTH_TYPE_API_KEY));
        entity.setOmpApiKey(trim(request.getOmpApiKey()));
        entity.setSyncEnabled(request.getSyncEnabled() == null ? Boolean.TRUE : request.getSyncEnabled());
        entity.setSyncIntervalSec(request.getSyncIntervalSec() == null ? Integer.valueOf(300) : request.getSyncIntervalSec());
        entity.setStatus(defaultText(request.getStatus(), STATUS_ENABLED));
        entity.setUpdatedAt(now);
        if (existing == null) {
            platformConfigMapper.insert(entity);
        } else {
            platformConfigMapper.update(entity);
        }
        return toPlatformConfigResponse(entity, environment, region);
    }

    @Transactional
    public void deletePlatformConfig(String tenantId, String id) {
        if (platformConfigMapper.selectById(tenantId, id) == null) {
            throw new BusinessException(ErrorCode.RESOURCE_NOT_FOUND, MessageKeys.PLATFORM_CONFIG_NOT_FOUND);
        }
        platformConfigMapper.deleteById(tenantId, id);
    }

    private EnvironmentEntity requireEnvironment(String tenantId, String id) {
        EnvironmentEntity entity = environmentMapper.selectById(tenantId, id);
        if (entity == null) {
            throw new BusinessException(ErrorCode.RESOURCE_NOT_FOUND, MessageKeys.ENVIRONMENT_NOT_FOUND);
        }
        return entity;
    }

    private RegionEntity requireRegion(String tenantId, String id) {
        RegionEntity entity = regionMapper.selectById(tenantId, id);
        if (entity == null) {
            throw new BusinessException(ErrorCode.RESOURCE_NOT_FOUND, MessageKeys.REGION_NOT_FOUND);
        }
        return entity;
    }

    private void assertEnvironmentCodeUnique(String tenantId, String currentId, String envCode) {
        EnvironmentEntity entity = environmentMapper.selectByCode(tenantId, trim(envCode));
        if (entity != null && !entity.getId().equals(currentId)) {
            throw new BusinessException(ErrorCode.CONFLICT, MessageKeys.ENVIRONMENT_CODE_EXISTS);
        }
    }

    private void assertRegionCodeUnique(String tenantId, String currentId, String envId, String regionCode) {
        RegionEntity entity = regionMapper.selectByCode(tenantId, envId, trim(regionCode));
        if (entity != null && !entity.getId().equals(currentId)) {
            throw new BusinessException(ErrorCode.CONFLICT, MessageKeys.REGION_CODE_EXISTS);
        }
    }

    private RegionEntity validateParentRegion(String tenantId, EnvironmentEntity environment, String regionType, String parentRegionId) {
        if (REGION_MANAGEMENT.equals(regionType)) {
            return null;
        }
        if (trim(parentRegionId).length() == 0) {
            throw new BusinessException(ErrorCode.BUSINESS_RULE_VIOLATED, MessageKeys.REGION_COMPUTE_PARENT_REQUIRED);
        }
        RegionEntity parent = requireRegion(tenantId, parentRegionId);
        if (!REGION_MANAGEMENT.equals(parent.getRegionType()) || !environment.getId().equals(parent.getEnvId())) {
            throw new BusinessException(ErrorCode.BUSINESS_RULE_VIOLATED, MessageKeys.REGION_COMPUTE_PARENT_INVALID);
        }
        return parent;
    }

    private List<StatCard> buildStats(List<EnvironmentEntity> environments,
                                      List<RegionEntity> regions,
                                      List<PlatformConfigEntity> platformConfigs) {
        int managementCount = 0;
        int computeCount = 0;
        for (RegionEntity region : regions) {
            if (REGION_MANAGEMENT.equals(region.getRegionType())) {
                managementCount++;
            }
            if (REGION_COMPUTE.equals(region.getRegionType())) {
                computeCount++;
            }
        }
        List<StatCard> stats = new ArrayList<StatCard>();
        stats.add(new StatCard(message(MessageKeys.STATS_ENVIRONMENT_TITLE), String.valueOf(environments.size()), message(MessageKeys.STATS_ENVIRONMENT_DESC)));
        stats.add(new StatCard(message(MessageKeys.STATS_MANAGEMENT_REGION_TITLE), String.valueOf(managementCount), message(MessageKeys.STATS_MANAGEMENT_REGION_DESC)));
        stats.add(new StatCard(message(MessageKeys.STATS_COMPUTE_REGION_TITLE), String.valueOf(computeCount), message(MessageKeys.STATS_COMPUTE_REGION_DESC)));
        stats.add(new StatCard(message(MessageKeys.STATS_CONFIGURED_REGION_TITLE), platformConfigs.size() + "/" + regions.size(), message(MessageKeys.STATS_CONFIGURED_REGION_DESC)));
        return stats;
    }

    private Map<String, EnvironmentEntity> indexEnvironments(List<EnvironmentEntity> environments) {
        Map<String, EnvironmentEntity> index = new HashMap<String, EnvironmentEntity>();
        for (EnvironmentEntity entity : environments) {
            index.put(entity.getId(), entity);
        }
        return index;
    }

    private Map<String, RegionEntity> indexRegions(List<RegionEntity> regions) {
        Map<String, RegionEntity> index = new HashMap<String, RegionEntity>();
        for (RegionEntity entity : regions) {
            index.put(entity.getId(), entity);
        }
        return index;
    }

    private List<EnvironmentResponse> toEnvironmentResponses(List<EnvironmentEntity> entities) {
        List<EnvironmentResponse> result = new ArrayList<EnvironmentResponse>();
        for (EnvironmentEntity entity : entities) {
            result.add(toEnvironmentResponse(entity));
        }
        return result;
    }

    private List<RegionResponse> toRegionResponses(List<RegionEntity> regions,
                                                   Map<String, EnvironmentEntity> environments,
                                                   Map<String, RegionEntity> regionIndex) {
        List<RegionResponse> result = new ArrayList<RegionResponse>();
        for (RegionEntity region : regions) {
            result.add(toRegionResponse(region, environments.get(region.getEnvId()), regionIndex.get(region.getParentRegionId())));
        }
        return result;
    }

    private List<PlatformConfigResponse> toPlatformConfigResponses(List<PlatformConfigEntity> configs,
                                                                   Map<String, EnvironmentEntity> environments,
                                                                   Map<String, RegionEntity> regions) {
        List<PlatformConfigResponse> result = new ArrayList<PlatformConfigResponse>();
        for (PlatformConfigEntity config : configs) {
            result.add(toPlatformConfigResponse(config, environments.get(config.getEnvId()), regions.get(config.getRegionId())));
        }
        return result;
    }

    private EnvironmentResponse toEnvironmentResponse(EnvironmentEntity entity) {
        EnvironmentResponse response = new EnvironmentResponse();
        response.setId(entity.getId());
        response.setEnvCode(entity.getEnvCode());
        response.setEnvName(entity.getEnvName());
        response.setDescription(entity.getDescription());
        response.setCreatedAt(entity.getCreatedAt());
        response.setUpdatedAt(entity.getUpdatedAt());
        return response;
    }

    private RegionResponse toRegionResponse(RegionEntity entity, EnvironmentEntity environment, RegionEntity parent) {
        RegionResponse response = new RegionResponse();
        response.setId(entity.getId());
        response.setEnvId(entity.getEnvId());
        response.setEnvName(environment == null ? "" : environment.getEnvName());
        response.setParentRegionId(entity.getParentRegionId());
        response.setParentRegionName(parent == null ? "" : parent.getRegionName());
        response.setRegionType(entity.getRegionType());
        response.setRegionCode(entity.getRegionCode());
        response.setRegionName(entity.getRegionName());
        response.setDescription(entity.getDescription());
        response.setCreatedAt(entity.getCreatedAt());
        response.setUpdatedAt(entity.getUpdatedAt());
        return response;
    }

    private PlatformConfigResponse toPlatformConfigResponse(PlatformConfigEntity entity, EnvironmentEntity environment, RegionEntity region) {
        PlatformConfigResponse response = new PlatformConfigResponse();
        response.setId(entity.getId());
        response.setEnvId(entity.getEnvId());
        response.setEnvName(environment == null ? "" : environment.getEnvName());
        response.setRegionId(entity.getRegionId());
        response.setRegionName(region == null ? "" : region.getRegionName());
        response.setName(entity.getName());
        response.setPlatformBaseUrl(entity.getPlatformBaseUrl());
        response.setOmpBaseUrl(entity.getOmpBaseUrl());
        response.setPlatformAuthType(entity.getPlatformAuthType());
        response.setPlatformApiKey(entity.getPlatformApiKey());
        response.setOmpAuthType(entity.getOmpAuthType());
        response.setOmpApiKey(entity.getOmpApiKey());
        response.setSyncEnabled(entity.getSyncEnabled());
        response.setSyncIntervalSec(entity.getSyncIntervalSec());
        response.setPlatformConnectionStatus(entity.getPlatformConnectionStatus());
        response.setOmpConnectionStatus(entity.getOmpConnectionStatus());
        response.setStatus(entity.getStatus());
        response.setCreatedAt(entity.getCreatedAt());
        response.setUpdatedAt(entity.getUpdatedAt());
        return response;
    }

    private String normalizedRegionType(String regionType) {
        String value = trim(regionType).toUpperCase();
        if (!REGION_MANAGEMENT.equals(value) && !REGION_COMPUTE.equals(value)) {
            throw new BusinessException(ErrorCode.VALIDATION_FAILED, MessageKeys.REGION_TYPE_INVALID);
        }
        return value;
    }

    private String message(String messageKey, Object... args) {
        return messageSource.getMessage(messageKey, args, messageKey, LocaleContextHolder.getLocale());
    }

    private String defaultText(String value, String defaultValue) {
        String text = trim(value);
        return text.length() == 0 ? defaultValue : text;
    }

    private String trim(String value) {
        return value == null ? "" : value.trim();
    }
}
