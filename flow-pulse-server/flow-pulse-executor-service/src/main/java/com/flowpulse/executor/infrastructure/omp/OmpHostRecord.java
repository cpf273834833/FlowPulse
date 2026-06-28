package com.flowpulse.executor.infrastructure.omp;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

@JsonIgnoreProperties(ignoreUnknown = true)
public class OmpHostRecord {
    private String ip;
    private String hostName;
    private Integer sshPort;
    private String user;
    private String passwd;
    private Integer daemonStatus;

    public String getIp() { return ip; }
    public void setIp(String ip) { this.ip = ip; }
    public String getHostName() { return hostName; }
    public void setHostName(String hostName) { this.hostName = hostName; }
    public Integer getSshPort() { return sshPort; }
    public void setSshPort(Integer sshPort) { this.sshPort = sshPort; }
    public String getUser() { return user; }
    public void setUser(String user) { this.user = user; }
    public String getPasswd() { return passwd; }
    public void setPasswd(String passwd) { this.passwd = passwd; }
    public Integer getDaemonStatus() { return daemonStatus; }
    public void setDaemonStatus(Integer daemonStatus) { this.daemonStatus = daemonStatus; }

    public boolean isAgentOnline() {
        return daemonStatus != null && daemonStatus.intValue() == 1;
    }
}
