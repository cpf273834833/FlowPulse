package com.flowpulse.alert.api.request;

import javax.validation.constraints.NotBlank;

public class NotificationChannelSaveRequest {
    @NotBlank(message = "{notification.channel.code.required}")
    private String channelCode;
    @NotBlank(message = "{notification.channel.name.required}")
    private String channelName;
    private String channelType;
    @NotBlank(message = "{notification.endpoint.required}")
    private String endpoint;
    private String apiKey;
    private Boolean enabled;
    private String description;

    public String getChannelCode() { return channelCode; }
    public void setChannelCode(String channelCode) { this.channelCode = channelCode; }
    public String getChannelName() { return channelName; }
    public void setChannelName(String channelName) { this.channelName = channelName; }
    public String getChannelType() { return channelType; }
    public void setChannelType(String channelType) { this.channelType = channelType; }
    public String getEndpoint() { return endpoint; }
    public void setEndpoint(String endpoint) { this.endpoint = endpoint; }
    public String getApiKey() { return apiKey; }
    public void setApiKey(String apiKey) { this.apiKey = apiKey; }
    public Boolean getEnabled() { return enabled; }
    public void setEnabled(Boolean enabled) { this.enabled = enabled; }
    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }
}
