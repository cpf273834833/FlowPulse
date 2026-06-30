package com.flowpulse.infrastructure.infrastructure.connector;

public class DiscoveredResource {
    private final String resourceType;
    private final String resourceName;
    private final String resourceCode;
    private final String status;
    private final String metadataJson;

    public DiscoveredResource(String resourceType, String resourceName, String resourceCode, String status, String metadataJson) {
        this.resourceType = resourceType;
        this.resourceName = resourceName;
        this.resourceCode = resourceCode;
        this.status = status;
        this.metadataJson = metadataJson;
    }

    public String getResourceType() { return resourceType; }
    public String getResourceName() { return resourceName; }
    public String getResourceCode() { return resourceCode; }
    public String getStatus() { return status; }
    public String getMetadataJson() { return metadataJson; }
}
