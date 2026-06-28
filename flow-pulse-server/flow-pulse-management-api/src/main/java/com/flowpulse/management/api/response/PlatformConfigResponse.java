package com.flowpulse.management.api.response;

public class PlatformConfigResponse {
    private String id;
    private String envId;
    private String envName;
    private String regionId;
    private String regionName;
    private String name;
    private String platformBaseUrl;
    private String ompBaseUrl;
    private String platformAuthType;
    private String platformApiKey;
    private String ompAuthType;
    private String ompApiKey;
    private Boolean syncEnabled;
    private Integer syncIntervalSec;
    private String platformConnectionStatus;
    private String ompConnectionStatus;
    private String status;
    private Long createdAt;
    private Long updatedAt;

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    public String getEnvId() { return envId; }
    public void setEnvId(String envId) { this.envId = envId; }
    public String getEnvName() { return envName; }
    public void setEnvName(String envName) { this.envName = envName; }
    public String getRegionId() { return regionId; }
    public void setRegionId(String regionId) { this.regionId = regionId; }
    public String getRegionName() { return regionName; }
    public void setRegionName(String regionName) { this.regionName = regionName; }
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public String getPlatformBaseUrl() { return platformBaseUrl; }
    public void setPlatformBaseUrl(String platformBaseUrl) { this.platformBaseUrl = platformBaseUrl; }
    public String getOmpBaseUrl() { return ompBaseUrl; }
    public void setOmpBaseUrl(String ompBaseUrl) { this.ompBaseUrl = ompBaseUrl; }
    public String getPlatformAuthType() { return platformAuthType; }
    public void setPlatformAuthType(String platformAuthType) { this.platformAuthType = platformAuthType; }
    public String getPlatformApiKey() { return platformApiKey; }
    public void setPlatformApiKey(String platformApiKey) { this.platformApiKey = platformApiKey; }
    public String getOmpAuthType() { return ompAuthType; }
    public void setOmpAuthType(String ompAuthType) { this.ompAuthType = ompAuthType; }
    public String getOmpApiKey() { return ompApiKey; }
    public void setOmpApiKey(String ompApiKey) { this.ompApiKey = ompApiKey; }
    public Boolean getSyncEnabled() { return syncEnabled; }
    public void setSyncEnabled(Boolean syncEnabled) { this.syncEnabled = syncEnabled; }
    public Integer getSyncIntervalSec() { return syncIntervalSec; }
    public void setSyncIntervalSec(Integer syncIntervalSec) { this.syncIntervalSec = syncIntervalSec; }
    public String getPlatformConnectionStatus() { return platformConnectionStatus; }
    public void setPlatformConnectionStatus(String platformConnectionStatus) { this.platformConnectionStatus = platformConnectionStatus; }
    public String getOmpConnectionStatus() { return ompConnectionStatus; }
    public void setOmpConnectionStatus(String ompConnectionStatus) { this.ompConnectionStatus = ompConnectionStatus; }
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
    public Long getCreatedAt() { return createdAt; }
    public void setCreatedAt(Long createdAt) { this.createdAt = createdAt; }
    public Long getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(Long updatedAt) { this.updatedAt = updatedAt; }
}
