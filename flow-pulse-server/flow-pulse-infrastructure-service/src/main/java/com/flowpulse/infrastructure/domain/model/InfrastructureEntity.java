package com.flowpulse.infrastructure.domain.model;

public class InfrastructureEntity {
    private String id;
    private String tenantId;
    private String type;
    private String code;
    private String name;
    private String envId;
    private String regionId;
    private String endpoint;
    private String authType;
    private String username;
    private String password;
    private String apiKey;
    private String syncScope;
    private String syncMode;
    private Boolean syncEnabled;
    private Integer syncIntervalSec;
    private String runStatus;
    private String connectionStatus;
    private String lastTestMessage;
    private Long lastTestAt;
    private Long lastSyncAt;
    private String lastSyncMessage;
    private String description;
    private Long createdAt;
    private Long updatedAt;

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    public String getTenantId() { return tenantId; }
    public void setTenantId(String tenantId) { this.tenantId = tenantId; }
    public String getType() { return type; }
    public void setType(String type) { this.type = type; }
    public String getCode() { return code; }
    public void setCode(String code) { this.code = code; }
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public String getEnvId() { return envId; }
    public void setEnvId(String envId) { this.envId = envId; }
    public String getRegionId() { return regionId; }
    public void setRegionId(String regionId) { this.regionId = regionId; }
    public String getEndpoint() { return endpoint; }
    public void setEndpoint(String endpoint) { this.endpoint = endpoint; }
    public String getAuthType() { return authType; }
    public void setAuthType(String authType) { this.authType = authType; }
    public String getUsername() { return username; }
    public void setUsername(String username) { this.username = username; }
    public String getPassword() { return password; }
    public void setPassword(String password) { this.password = password; }
    public String getApiKey() { return apiKey; }
    public void setApiKey(String apiKey) { this.apiKey = apiKey; }
    public String getSyncScope() { return syncScope; }
    public void setSyncScope(String syncScope) { this.syncScope = syncScope; }
    public String getSyncMode() { return syncMode; }
    public void setSyncMode(String syncMode) { this.syncMode = syncMode; }
    public Boolean getSyncEnabled() { return syncEnabled; }
    public void setSyncEnabled(Boolean syncEnabled) { this.syncEnabled = syncEnabled; }
    public Integer getSyncIntervalSec() { return syncIntervalSec; }
    public void setSyncIntervalSec(Integer syncIntervalSec) { this.syncIntervalSec = syncIntervalSec; }
    public String getRunStatus() { return runStatus; }
    public void setRunStatus(String runStatus) { this.runStatus = runStatus; }
    public String getConnectionStatus() { return connectionStatus; }
    public void setConnectionStatus(String connectionStatus) { this.connectionStatus = connectionStatus; }
    public String getLastTestMessage() { return lastTestMessage; }
    public void setLastTestMessage(String lastTestMessage) { this.lastTestMessage = lastTestMessage; }
    public Long getLastTestAt() { return lastTestAt; }
    public void setLastTestAt(Long lastTestAt) { this.lastTestAt = lastTestAt; }
    public Long getLastSyncAt() { return lastSyncAt; }
    public void setLastSyncAt(Long lastSyncAt) { this.lastSyncAt = lastSyncAt; }
    public String getLastSyncMessage() { return lastSyncMessage; }
    public void setLastSyncMessage(String lastSyncMessage) { this.lastSyncMessage = lastSyncMessage; }
    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }
    public Long getCreatedAt() { return createdAt; }
    public void setCreatedAt(Long createdAt) { this.createdAt = createdAt; }
    public Long getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(Long updatedAt) { this.updatedAt = updatedAt; }
}
