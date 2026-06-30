package com.flowpulse.infrastructure.api.response;

public class InfrastructureActionResponse {
    private String status;
    private String message;
    private Long operatedAt;

    public InfrastructureActionResponse() {
    }

    public InfrastructureActionResponse(String status, String message, Long operatedAt) {
        this.status = status;
        this.message = message;
        this.operatedAt = operatedAt;
    }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
    public String getMessage() { return message; }
    public void setMessage(String message) { this.message = message; }
    public Long getOperatedAt() { return operatedAt; }
    public void setOperatedAt(Long operatedAt) { this.operatedAt = operatedAt; }
}
