package com.flowpulse.management.api.request;

import javax.validation.constraints.NotBlank;
import javax.validation.constraints.Size;

public class EnvironmentSaveRequest {
    @NotBlank(message = "{environment.envCode.required}")
    @Size(max = 64, message = "{environment.envCode.size}")
    private String envCode;

    @NotBlank(message = "{environment.envName.required}")
    @Size(max = 128, message = "{environment.envName.size}")
    private String envName;

    @Size(max = 512, message = "{common.description.size}")
    private String description;

    public String getEnvCode() {
        return envCode;
    }

    public void setEnvCode(String envCode) {
        this.envCode = envCode;
    }

    public String getEnvName() {
        return envName;
    }

    public void setEnvName(String envName) {
        this.envName = envName;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }
}
