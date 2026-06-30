package com.flowpulse.infrastructure.infrastructure.connector;

import com.flowpulse.infrastructure.domain.model.InfrastructureEntity;

import java.util.List;

public interface InfrastructureConnector {
    boolean supports(String type);
    ConnectionCheckResult test(InfrastructureEntity entity);
    List<DiscoveredResource> discover(InfrastructureEntity entity);
}
