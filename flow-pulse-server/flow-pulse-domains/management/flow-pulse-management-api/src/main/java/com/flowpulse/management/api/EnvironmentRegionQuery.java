package com.flowpulse.management.api;

import com.flowpulse.management.api.response.EnvironmentRegionPageResponse;

/** Read-only port exposed by the management domain. */
public interface EnvironmentRegionQuery {
    EnvironmentRegionPageResponse page(String tenantId);
}
