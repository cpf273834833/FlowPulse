package com.flowpulse.executor.application;

import com.flowpulse.common.BusinessException;
import com.flowpulse.common.ErrorCode;
import com.flowpulse.common.IdGenerator;
import com.flowpulse.common.MessageKeys;
import com.flowpulse.common.StatCard;
import com.flowpulse.executor.api.request.ExecutorNodeQueryRequest;
import com.flowpulse.executor.api.request.ExecutorNodeSaveRequest;
import com.flowpulse.executor.api.response.ExecutorNodeActionResponse;
import com.flowpulse.executor.api.response.ExecutorNodePageResponse;
import com.flowpulse.executor.api.response.ExecutorNodeResponse;
import com.flowpulse.executor.api.response.PageResponse;
import com.flowpulse.executor.domain.model.ExecutorNodeEntity;
import com.flowpulse.executor.infrastructure.omp.OmpHostClient;
import com.flowpulse.executor.infrastructure.omp.OmpHostRecord;
import com.flowpulse.executor.infrastructure.persistence.mapper.ExecutorNodeMapper;
import com.flowpulse.executor.infrastructure.ssh.SshConnectionTester;
import com.flowpulse.executor.infrastructure.ssh.SshTestResult;
import com.flowpulse.management.api.response.EnvironmentRegionPageResponse;
import com.flowpulse.management.api.response.EnvironmentResponse;
import com.flowpulse.management.api.response.PlatformConfigResponse;
import com.flowpulse.management.api.response.RegionResponse;
import com.flowpulse.management.api.EnvironmentRegionQuery;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
public class ExecutorNodeService {
    private static final String SOURCE_MANUAL = "MANUAL";
    private static final String SOURCE_OMP = "OMP";
    private static final String AUTH_PASSWORD = "PASSWORD";
    private static final String AUTH_PRIVATE_KEY = "PRIVATE_KEY";
    private static final String CONNECTION_UNKNOWN = "UNKNOWN";
    private static final String CONNECTION_NORMAL = "NORMAL";
    private static final String CONNECTION_ERROR = "ERROR";
    private static final String AGENT_UNKNOWN = "UNKNOWN";

    private final ExecutorNodeMapper executorNodeMapper;
    private final EnvironmentRegionQuery environmentRegionQuery;
    private final SshConnectionTester sshConnectionTester;
    private final OmpHostClient ompHostClient;

    public ExecutorNodeService(ExecutorNodeMapper executorNodeMapper,
                               EnvironmentRegionQuery environmentRegionQuery,
                               SshConnectionTester sshConnectionTester,
                               OmpHostClient ompHostClient) {
        this.executorNodeMapper = executorNodeMapper;
        this.environmentRegionQuery = environmentRegionQuery;
        this.sshConnectionTester = sshConnectionTester;
        this.ompHostClient = ompHostClient;
    }

    public ExecutorNodePageResponse page(String tenantId, ExecutorNodeQueryRequest request) {
        ExecutorNodeQueryRequest query = request == null ? new ExecutorNodeQueryRequest() : request;
        QueryWindow window = normalizeWindow(query);
        List<ExecutorNodeEntity> entities = executorNodeMapper.selectPage(
                tenantId, trim(query.getKeyword()), trim(query.getEnvId()), trim(query.getRegionId()),
                trim(query.getSourceType()), trim(query.getConnectionStatus()), window.offset, window.pageSize);
        long total = executorNodeMapper.countPage(
                tenantId, trim(query.getKeyword()), trim(query.getEnvId()), trim(query.getRegionId()),
                trim(query.getSourceType()), trim(query.getConnectionStatus()));

        EnvironmentRegionPageResponse regionPage = environmentRegionQuery.page(tenantId);
        Map<String, EnvironmentResponse> environments = indexEnvironments(regionPage.getEnvironments());
        Map<String, RegionResponse> regions = indexRegions(regionPage.getRegions());

        PageResponse<ExecutorNodeResponse> nodes = new PageResponse<ExecutorNodeResponse>();
        nodes.setRecords(toResponses(entities, environments, regions));
        nodes.setTotal(total);
        nodes.setPageNo(window.pageNo);
        nodes.setPageSize(window.pageSize);

        ExecutorNodePageResponse response = new ExecutorNodePageResponse();
        response.setNodes(nodes);
        response.setEnvironments(regionPage.getEnvironments());
        response.setRegions(regionPage.getRegions());
        response.setStats(buildStats(tenantId));
        return response;
    }

    public ExecutorNodeResponse detail(String tenantId, String id) {
        ExecutorNodeEntity entity = requireNode(tenantId, id);
        EnvironmentRegionPageResponse regionPage = environmentRegionQuery.page(tenantId);
        return toResponse(entity, indexEnvironments(regionPage.getEnvironments()), indexRegions(regionPage.getRegions()));
    }

    @Transactional
    public ExecutorNodeResponse create(String tenantId, ExecutorNodeSaveRequest request) {
        validateIdentity(request.getEnvId(), request.getRegionId(), request.getHost());
        assertHostUnique(tenantId, null, request.getEnvId(), request.getRegionId(), request.getHost());
        long now = System.currentTimeMillis();
        ExecutorNodeEntity entity = new ExecutorNodeEntity();
        entity.setId(IdGenerator.nextId());
        entity.setTenantId(tenantId);
        entity.setEnvId(trim(request.getEnvId()));
        entity.setRegionId(trim(request.getRegionId()));
        entity.setHost(trim(request.getHost()));
        applyNodeConfig(entity, request, null);
        entity.setSourceType(SOURCE_MANUAL);
        entity.setSshSupported(Boolean.FALSE);
        entity.setAgentSupported(Boolean.FALSE);
        entity.setAgentStatus(AGENT_UNKNOWN);
        entity.setConnectionStatus(CONNECTION_UNKNOWN);
        entity.setCreatedAt(Long.valueOf(now));
        entity.setUpdatedAt(Long.valueOf(now));
        executorNodeMapper.insert(entity);
        return detail(tenantId, entity.getId());
    }

    @Transactional
    public ExecutorNodeResponse update(String tenantId, String id, ExecutorNodeSaveRequest request) {
        ExecutorNodeEntity entity = requireNode(tenantId, id);
        validateIdentity(request.getEnvId(), request.getRegionId(), entity.getHost());
        assertHostUnique(tenantId, id, request.getEnvId(), request.getRegionId(), entity.getHost());
        entity.setEnvId(trim(request.getEnvId()));
        entity.setRegionId(trim(request.getRegionId()));
        applyNodeConfig(entity, request, entity);
        entity.setUpdatedAt(Long.valueOf(System.currentTimeMillis()));
        executorNodeMapper.update(entity);
        return detail(tenantId, id);
    }

    @Transactional
    public void delete(String tenantId, String id) {
        requireNode(tenantId, id);
        executorNodeMapper.deleteById(tenantId, id);
    }

    @Transactional
    public ExecutorNodeActionResponse testConnection(String tenantId, String id) {
        ExecutorNodeEntity entity = requireNode(tenantId, id);
        validateSshReady(entity);
        SshTestResult testResult = sshConnectionTester.test(entity);
        long now = System.currentTimeMillis();
        entity.setSshSupported(Boolean.valueOf(testResult.isSuccess()));
        entity.setConnectionStatus(testResult.isSuccess() ? CONNECTION_NORMAL : CONNECTION_ERROR);
        entity.setLastTestMessage(testResult.getMessage());
        entity.setLastTestAt(Long.valueOf(now));
        entity.setUpdatedAt(Long.valueOf(now));
        executorNodeMapper.update(entity);

        ExecutorNodeActionResponse response = new ExecutorNodeActionResponse();
        response.setSuccess(Boolean.valueOf(testResult.isSuccess()));
        response.setStatus(entity.getConnectionStatus());
        response.setMessage(entity.getHost() + (testResult.isSuccess() ? " SSH 连接测试通过" : " SSH 连接测试失败：" + testResult.getMessage()));
        response.setAffectedCount(Integer.valueOf(1));
        return response;
    }

    @Transactional
    public ExecutorNodeActionResponse syncFromOmp(String tenantId, String regionId) {
        if (trim(regionId).length() == 0) {
            throw new BusinessException(ErrorCode.VALIDATION_FAILED, MessageKeys.EXECUTOR_NODE_REGION_REQUIRED);
        }
        EnvironmentRegionPageResponse regionPage = environmentRegionQuery.page(tenantId);
        RegionResponse region = findRegion(regionPage.getRegions(), regionId);
        PlatformConfigResponse config = findPlatformConfig(regionPage.getPlatformConfigs(), regionId);
        if (config == null || trim(config.getOmpBaseUrl()).length() == 0 || trim(config.getOmpApiKey()).length() == 0) {
            throw new BusinessException(ErrorCode.BUSINESS_RULE_VIOLATED, MessageKeys.EXECUTOR_NODE_OMP_CONFIG_REQUIRED);
        }
        List<OmpHostRecord> hosts = ompHostClient.queryHosts(config.getOmpBaseUrl(), config.getOmpApiKey());
        int affected = 0;
        long now = System.currentTimeMillis();
        for (OmpHostRecord host : hosts) {
            String ip = trim(host.getIp());
            if (ip.length() == 0) {
                continue;
            }
            ExecutorNodeEntity existing = executorNodeMapper.selectByHost(tenantId, region.getEnvId(), region.getId(), ip);
            if (existing != null && !SOURCE_OMP.equals(existing.getSourceType())) {
                continue;
            }
            ExecutorNodeEntity entity = existing == null ? new ExecutorNodeEntity() : existing;
            if (existing == null) {
                entity.setId(IdGenerator.nextId());
                entity.setTenantId(tenantId);
                entity.setEnvId(region.getEnvId());
                entity.setRegionId(region.getId());
                entity.setHost(ip);
                entity.setSourceType(SOURCE_OMP);
                entity.setSshSupported(Boolean.FALSE);
                entity.setConnectionStatus(CONNECTION_UNKNOWN);
                entity.setCreatedAt(Long.valueOf(now));
            }
            entity.setSshPort(host.getSshPort() == null ? Integer.valueOf(22) : host.getSshPort());
            entity.setSshUsername(trim(host.getUser()));
            entity.setSshPassword(trim(host.getPasswd()));
            entity.setSshAuthType(AUTH_PASSWORD);
            entity.setSshPrivateKey("");
            entity.setAgentSupported(Boolean.FALSE);
            entity.setAgentStatus(AGENT_UNKNOWN);
            entity.setLastSyncAt(Long.valueOf(now));
            entity.setUpdatedAt(Long.valueOf(now));
            if (existing == null) {
                executorNodeMapper.insert(entity);
            } else {
                executorNodeMapper.update(entity);
            }
            affected++;
        }
        ExecutorNodeActionResponse response = new ExecutorNodeActionResponse();
        response.setSuccess(Boolean.TRUE);
        response.setStatus("SUCCESS");
        response.setAffectedCount(Integer.valueOf(affected));
        response.setMessage("已从 OMP 同步执行节点 " + affected + " 台");
        return response;
    }

    private void validateIdentity(String envId, String regionId, String host) {
        if (trim(envId).length() == 0 || trim(regionId).length() == 0) {
            throw new BusinessException(ErrorCode.VALIDATION_FAILED, MessageKeys.EXECUTOR_NODE_REGION_REQUIRED);
        }
        if (trim(host).length() == 0) {
            throw new BusinessException(ErrorCode.VALIDATION_FAILED, MessageKeys.EXECUTOR_NODE_HOST_REQUIRED);
        }
    }

    private void assertHostUnique(String tenantId, String currentId, String envId, String regionId, String host) {
        ExecutorNodeEntity existing = executorNodeMapper.selectByHost(tenantId, trim(envId), trim(regionId), trim(host));
        if (existing != null && !existing.getId().equals(currentId)) {
            throw new BusinessException(ErrorCode.CONFLICT, MessageKeys.EXECUTOR_NODE_HOST_EXISTS);
        }
    }

    private void applyNodeConfig(ExecutorNodeEntity entity, ExecutorNodeSaveRequest request, ExecutorNodeEntity existing) {
        entity.setSshPort(request.getSshPort() == null ? Integer.valueOf(22) : request.getSshPort());
        entity.setSshUsername(trim(request.getSshUsername()));
        entity.setSshAuthType(defaultText(request.getSshAuthType(), AUTH_PASSWORD));
        entity.setSshPassword(credentialValue(request.getSshPassword(), existing == null ? null : existing.getSshPassword()));
        entity.setSshPrivateKey(credentialValue(request.getSshPrivateKey(), existing == null ? null : existing.getSshPrivateKey()));
        entity.setJavaHome(trim(request.getJavaHome()));
        entity.setPythonPath(trim(request.getPythonPath()));
    }

    private String credentialValue(String incoming, String previous) {
        String value = trim(incoming);
        if (value.length() == 0 && previous != null) {
            return previous;
        }
        return value;
    }

    private void validateSshReady(ExecutorNodeEntity entity) {
        boolean hasBasic = trim(entity.getHost()).length() > 0 && entity.getSshPort() != null && trim(entity.getSshUsername()).length() > 0;
        boolean hasPassword = AUTH_PASSWORD.equals(entity.getSshAuthType()) && trim(entity.getSshPassword()).length() > 0;
        boolean hasPrivateKey = AUTH_PRIVATE_KEY.equals(entity.getSshAuthType()) && trim(entity.getSshPrivateKey()).length() > 0;
        if (!hasBasic || (!hasPassword && !hasPrivateKey)) {
            throw new BusinessException(ErrorCode.BUSINESS_RULE_VIOLATED, MessageKeys.EXECUTOR_NODE_SSH_CONFIG_REQUIRED);
        }
    }

    private ExecutorNodeEntity requireNode(String tenantId, String id) {
        ExecutorNodeEntity entity = executorNodeMapper.selectById(tenantId, id);
        if (entity == null) {
            throw new BusinessException(ErrorCode.RESOURCE_NOT_FOUND, MessageKeys.EXECUTOR_NODE_NOT_FOUND);
        }
        return entity;
    }

    private QueryWindow normalizeWindow(ExecutorNodeQueryRequest query) {
        int pageNo = query.getPageNo() == null || query.getPageNo().intValue() < 1 ? 1 : query.getPageNo().intValue();
        int pageSize = query.getPageSize() == null ? 20 : query.getPageSize().intValue();
        if (pageSize < 1) {
            pageSize = 20;
        }
        if (pageSize > 100) {
            pageSize = 100;
        }
        return new QueryWindow(pageNo, pageSize, (pageNo - 1) * pageSize);
    }

    private List<ExecutorNodeResponse> toResponses(List<ExecutorNodeEntity> entities,
                                                   Map<String, EnvironmentResponse> environments,
                                                   Map<String, RegionResponse> regions) {
        List<ExecutorNodeResponse> result = new ArrayList<ExecutorNodeResponse>();
        for (ExecutorNodeEntity entity : entities) {
            result.add(toResponse(entity, environments, regions));
        }
        return result;
    }

    private ExecutorNodeResponse toResponse(ExecutorNodeEntity entity,
                                            Map<String, EnvironmentResponse> environments,
                                            Map<String, RegionResponse> regions) {
        EnvironmentResponse env = environments.get(entity.getEnvId());
        RegionResponse region = regions.get(entity.getRegionId());
        ExecutorNodeResponse response = new ExecutorNodeResponse();
        response.setId(entity.getId());
        response.setEnvId(entity.getEnvId());
        response.setEnvName(env == null ? "" : env.getEnvName());
        response.setRegionId(entity.getRegionId());
        response.setRegionName(region == null ? "" : region.getRegionName());
        response.setParentRegionId(region == null ? "" : region.getParentRegionId());
        response.setParentRegionName(region == null ? "" : region.getParentRegionName());
        response.setHost(entity.getHost());
        response.setSshPort(entity.getSshPort());
        response.setSshUsername(entity.getSshUsername());
        response.setSshAuthType(entity.getSshAuthType());
        response.setCredentialConfigured(Boolean.valueOf(
                AUTH_PRIVATE_KEY.equals(entity.getSshAuthType())
                        ? trim(entity.getSshPrivateKey()).length() > 0
                        : trim(entity.getSshPassword()).length() > 0));
        response.setJavaHome(entity.getJavaHome());
        response.setPythonPath(entity.getPythonPath());
        response.setSourceType(entity.getSourceType());
        response.setSshSupported(entity.getSshSupported());
        response.setAgentSupported(entity.getAgentSupported());
        response.setAgentStatus(entity.getAgentStatus());
        response.setConnectionStatus(entity.getConnectionStatus());
        response.setLastTestMessage(entity.getLastTestMessage());
        response.setLastTestAt(entity.getLastTestAt());
        response.setLastSyncAt(entity.getLastSyncAt());
        response.setCreatedAt(entity.getCreatedAt());
        response.setUpdatedAt(entity.getUpdatedAt());
        return response;
    }

    private Map<String, EnvironmentResponse> indexEnvironments(List<EnvironmentResponse> environments) {
        Map<String, EnvironmentResponse> result = new HashMap<String, EnvironmentResponse>();
        for (EnvironmentResponse env : environments) {
            result.put(env.getId(), env);
        }
        return result;
    }

    private Map<String, RegionResponse> indexRegions(List<RegionResponse> regions) {
        Map<String, RegionResponse> result = new HashMap<String, RegionResponse>();
        for (RegionResponse region : regions) {
            result.put(region.getId(), region);
        }
        return result;
    }

    private RegionResponse findRegion(List<RegionResponse> regions, String regionId) {
        for (RegionResponse region : regions) {
            if (region.getId().equals(regionId)) {
                return region;
            }
        }
        throw new BusinessException(ErrorCode.RESOURCE_NOT_FOUND, MessageKeys.REGION_NOT_FOUND);
    }

    private PlatformConfigResponse findPlatformConfig(List<PlatformConfigResponse> configs, String regionId) {
        for (PlatformConfigResponse config : configs) {
            if (regionId.equals(config.getRegionId())) {
                return config;
            }
        }
        return null;
    }

    private List<StatCard> buildStats(String tenantId) {
        List<StatCard> stats = new ArrayList<StatCard>();
        stats.add(new StatCard("执行节点", String.valueOf(executorNodeMapper.countAll(tenantId)), "可用于脚本指标采集的主机"));
        stats.add(new StatCard("SSH 可用", String.valueOf(executorNodeMapper.countBySshSupported(tenantId)), "已通过 SSH 连接测试"));
        stats.add(new StatCard("Agent 可用", String.valueOf(executorNodeMapper.countByAgentSupported(tenantId)), "已检测到 Agent 心跳"));
        stats.add(new StatCard("OMP 接入", String.valueOf(executorNodeMapper.countBySourceType(tenantId, SOURCE_OMP)), "由区域 OMP 同步接入"));
        return stats;
    }

    private String defaultText(String value, String defaultValue) {
        String text = trim(value);
        return text.length() == 0 ? defaultValue : text;
    }

    private String trim(String value) {
        return value == null ? "" : value.trim();
    }

    private static class QueryWindow {
        private final int pageNo;
        private final int pageSize;
        private final int offset;

        private QueryWindow(int pageNo, int pageSize, int offset) {
            this.pageNo = pageNo;
            this.pageSize = pageSize;
            this.offset = offset;
        }
    }
}
