package com.flowpulse.executor.api.response;

public class ExecutorNodeResponse {
    private String id;
    private String envId;
    private String envName;
    private String regionId;
    private String regionName;
    private String parentRegionId;
    private String parentRegionName;
    private String host;
    private Integer sshPort;
    private String sshUsername;
    private String sshAuthType;
    private String javaHome;
    private String pythonPath;
    private String sourceType;
    private Boolean sshSupported;
    private Boolean agentSupported;
    private String agentStatus;
    private String connectionStatus;
    private String lastTestMessage;
    private Long lastTestAt;
    private Long lastSyncAt;
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
    public String getParentRegionId() { return parentRegionId; }
    public void setParentRegionId(String parentRegionId) { this.parentRegionId = parentRegionId; }
    public String getParentRegionName() { return parentRegionName; }
    public void setParentRegionName(String parentRegionName) { this.parentRegionName = parentRegionName; }
    public String getHost() { return host; }
    public void setHost(String host) { this.host = host; }
    public Integer getSshPort() { return sshPort; }
    public void setSshPort(Integer sshPort) { this.sshPort = sshPort; }
    public String getSshUsername() { return sshUsername; }
    public void setSshUsername(String sshUsername) { this.sshUsername = sshUsername; }
    public String getSshAuthType() { return sshAuthType; }
    public void setSshAuthType(String sshAuthType) { this.sshAuthType = sshAuthType; }
    public String getJavaHome() { return javaHome; }
    public void setJavaHome(String javaHome) { this.javaHome = javaHome; }
    public String getPythonPath() { return pythonPath; }
    public void setPythonPath(String pythonPath) { this.pythonPath = pythonPath; }
    public String getSourceType() { return sourceType; }
    public void setSourceType(String sourceType) { this.sourceType = sourceType; }
    public Boolean getSshSupported() { return sshSupported; }
    public void setSshSupported(Boolean sshSupported) { this.sshSupported = sshSupported; }
    public Boolean getAgentSupported() { return agentSupported; }
    public void setAgentSupported(Boolean agentSupported) { this.agentSupported = agentSupported; }
    public String getAgentStatus() { return agentStatus; }
    public void setAgentStatus(String agentStatus) { this.agentStatus = agentStatus; }
    public String getConnectionStatus() { return connectionStatus; }
    public void setConnectionStatus(String connectionStatus) { this.connectionStatus = connectionStatus; }
    public String getLastTestMessage() { return lastTestMessage; }
    public void setLastTestMessage(String lastTestMessage) { this.lastTestMessage = lastTestMessage; }
    public Long getLastTestAt() { return lastTestAt; }
    public void setLastTestAt(Long lastTestAt) { this.lastTestAt = lastTestAt; }
    public Long getLastSyncAt() { return lastSyncAt; }
    public void setLastSyncAt(Long lastSyncAt) { this.lastSyncAt = lastSyncAt; }
    public Long getCreatedAt() { return createdAt; }
    public void setCreatedAt(Long createdAt) { this.createdAt = createdAt; }
    public Long getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(Long updatedAt) { this.updatedAt = updatedAt; }
}
