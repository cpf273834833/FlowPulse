package com.flowpulse.infrastructure.api.response;

public class EnvironmentOptionResponse {
    private String id;
    private String envCode;
    private String envName;

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    public String getEnvCode() { return envCode; }
    public void setEnvCode(String envCode) { this.envCode = envCode; }
    public String getEnvName() { return envName; }
    public void setEnvName(String envName) { this.envName = envName; }
}
