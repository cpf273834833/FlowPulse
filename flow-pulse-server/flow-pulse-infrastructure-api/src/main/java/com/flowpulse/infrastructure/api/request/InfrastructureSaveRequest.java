package com.flowpulse.infrastructure.api.request;

import javax.validation.constraints.Min;
import javax.validation.constraints.NotBlank;
import javax.validation.constraints.Size;

public class InfrastructureSaveRequest {
    @NotBlank(message = "{infrastructure.type.required}")
    @Size(max = 32, message = "{infrastructure.type.size}")
    private String type;

    @NotBlank(message = "{infrastructure.code.required}")
    @Size(max = 64, message = "{infrastructure.code.size}")
    private String code;

    @NotBlank(message = "{infrastructure.name.required}")
    @Size(max = 128, message = "{infrastructure.name.size}")
    private String name;

    @NotBlank(message = "{infrastructure.envId.required}")
    @Size(min = 32, max = 32, message = "{infrastructure.envId.size}")
    private String envId;

    @NotBlank(message = "{infrastructure.regionId.required}")
    @Size(min = 32, max = 32, message = "{infrastructure.regionId.size}")
    private String regionId;

    @NotBlank(message = "{infrastructure.endpoint.required}")
    @Size(max = 1024, message = "{infrastructure.endpoint.size}")
    private String endpoint;

    @Size(max = 32, message = "{common.status.size}")
    private String authType;

    @Size(max = 128, message = "{infrastructure.username.size}")
    private String username;

    @Size(max = 256, message = "{infrastructure.password.size}")
    private String password;

    @Size(max = 256, message = "{infrastructure.apiKey.size}")
    private String apiKey;

    @Size(max = 1024, message = "{infrastructure.syncScope.size}")
    private String syncScope;

    @Size(max = 32, message = "{common.status.size}")
    private String syncMode;

    @Min(value = 10, message = "{infrastructure.syncInterval.min}")
    private Integer syncIntervalSec;

    private Boolean syncEnabled;

    @Size(max = 512, message = "{common.description.size}")
    private String description;

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
    public Integer getSyncIntervalSec() { return syncIntervalSec; }
    public void setSyncIntervalSec(Integer syncIntervalSec) { this.syncIntervalSec = syncIntervalSec; }
    public Boolean getSyncEnabled() { return syncEnabled; }
    public void setSyncEnabled(Boolean syncEnabled) { this.syncEnabled = syncEnabled; }
    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }
}
