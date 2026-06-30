package com.flowpulse.management.api.request;

import javax.validation.constraints.Max;
import javax.validation.constraints.Min;
import javax.validation.constraints.NotBlank;
import javax.validation.constraints.Size;

public class PlatformConfigSaveRequest {
    @Size(min = 32, max = 32, message = "{platformConfig.id.size}")
    private String id;

    @NotBlank(message = "{platformConfig.regionId.required}")
    @Size(min = 32, max = 32, message = "{platformConfig.regionId.size}")
    private String regionId;

    @Size(max = 128, message = "{platformConfig.name.size}")
    private String name;

    @Size(max = 512, message = "{platformConfig.platformBaseUrl.size}")
    private String platformBaseUrl;

    @Size(max = 512, message = "{platformConfig.ompBaseUrl.size}")
    private String ompBaseUrl;

    @Size(max = 32, message = "{platformConfig.platformAuthType.size}")
    private String platformAuthType;

    @Size(max = 256, message = "{platformConfig.platformApiKey.size}")
    private String platformApiKey;

    @Size(max = 32, message = "{platformConfig.ompAuthType.size}")
    private String ompAuthType;

    @Size(max = 256, message = "{platformConfig.ompApiKey.size}")
    private String ompApiKey;

    private Boolean syncEnabled;

    @Min(value = 10, message = "{platformConfig.syncInterval.min}")
    @Max(value = 86400, message = "{platformConfig.syncInterval.max}")
    private Integer syncIntervalSec;

    @Size(max = 32, message = "{common.status.size}")
    private String status;

    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public String getRegionId() {
        return regionId;
    }

    public void setRegionId(String regionId) {
        this.regionId = regionId;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getPlatformBaseUrl() {
        return platformBaseUrl;
    }

    public void setPlatformBaseUrl(String platformBaseUrl) {
        this.platformBaseUrl = platformBaseUrl;
    }

    public String getOmpBaseUrl() {
        return ompBaseUrl;
    }

    public void setOmpBaseUrl(String ompBaseUrl) {
        this.ompBaseUrl = ompBaseUrl;
    }

    public String getPlatformAuthType() {
        return platformAuthType;
    }

    public void setPlatformAuthType(String platformAuthType) {
        this.platformAuthType = platformAuthType;
    }

    public String getPlatformApiKey() {
        return platformApiKey;
    }

    public void setPlatformApiKey(String platformApiKey) {
        this.platformApiKey = platformApiKey;
    }

    public String getOmpAuthType() {
        return ompAuthType;
    }

    public void setOmpAuthType(String ompAuthType) {
        this.ompAuthType = ompAuthType;
    }

    public String getOmpApiKey() {
        return ompApiKey;
    }

    public void setOmpApiKey(String ompApiKey) {
        this.ompApiKey = ompApiKey;
    }

    public Boolean getSyncEnabled() {
        return syncEnabled;
    }

    public void setSyncEnabled(Boolean syncEnabled) {
        this.syncEnabled = syncEnabled;
    }

    public Integer getSyncIntervalSec() {
        return syncIntervalSec;
    }

    public void setSyncIntervalSec(Integer syncIntervalSec) {
        this.syncIntervalSec = syncIntervalSec;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }
}
