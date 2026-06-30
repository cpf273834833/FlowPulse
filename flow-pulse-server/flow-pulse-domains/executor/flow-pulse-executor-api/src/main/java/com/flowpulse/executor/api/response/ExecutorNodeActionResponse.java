package com.flowpulse.executor.api.response;

public class ExecutorNodeActionResponse {
    private Boolean success;
    private String status;
    private String message;
    private Integer affectedCount;

    public Boolean getSuccess() { return success; }
    public void setSuccess(Boolean success) { this.success = success; }
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
    public String getMessage() { return message; }
    public void setMessage(String message) { this.message = message; }
    public Integer getAffectedCount() { return affectedCount; }
    public void setAffectedCount(Integer affectedCount) { this.affectedCount = affectedCount; }
}
