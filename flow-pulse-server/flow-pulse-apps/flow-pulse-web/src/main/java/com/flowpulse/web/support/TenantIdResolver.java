package com.flowpulse.web.support;

import com.flowpulse.common.TenantContext;
import org.springframework.stereotype.Component;

import javax.servlet.http.HttpServletRequest;

@Component
public class TenantIdResolver {
    public String resolve(HttpServletRequest request) {
        String tenantId = request.getHeader("X-Tenant-Id");
        if (tenantId == null || tenantId.trim().length() == 0) {
            tenantId = request.getHeader("tenantId");
        }
        return TenantContext.normalize(tenantId);
    }
}
