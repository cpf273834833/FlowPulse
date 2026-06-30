package com.flowpulse.executor.api.request;

public class ExecutorNodeSaveRequest {
    private String envId;
    private String regionId;
    private String host;
    private Integer sshPort;
    private String sshUsername;
    private String sshPassword;
    private String sshAuthType;
    private String sshPrivateKey;
    private String javaHome;
    private String pythonPath;

    public String getEnvId() { return envId; }
    public void setEnvId(String envId) { this.envId = envId; }
    public String getRegionId() { return regionId; }
    public void setRegionId(String regionId) { this.regionId = regionId; }
    public String getHost() { return host; }
    public void setHost(String host) { this.host = host; }
    public Integer getSshPort() { return sshPort; }
    public void setSshPort(Integer sshPort) { this.sshPort = sshPort; }
    public String getSshUsername() { return sshUsername; }
    public void setSshUsername(String sshUsername) { this.sshUsername = sshUsername; }
    public String getSshPassword() { return sshPassword; }
    public void setSshPassword(String sshPassword) { this.sshPassword = sshPassword; }
    public String getSshAuthType() { return sshAuthType; }
    public void setSshAuthType(String sshAuthType) { this.sshAuthType = sshAuthType; }
    public String getSshPrivateKey() { return sshPrivateKey; }
    public void setSshPrivateKey(String sshPrivateKey) { this.sshPrivateKey = sshPrivateKey; }
    public String getJavaHome() { return javaHome; }
    public void setJavaHome(String javaHome) { this.javaHome = javaHome; }
    public String getPythonPath() { return pythonPath; }
    public void setPythonPath(String pythonPath) { this.pythonPath = pythonPath; }
}
