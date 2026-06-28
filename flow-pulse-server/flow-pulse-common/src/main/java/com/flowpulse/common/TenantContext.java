package com.flowpulse.common;

public final class TenantContext {
    public static final String DEFAULT_TENANT_ID = "00000000000000000000000000000000";

    private TenantContext() {
    }

    public static String normalize(String tenantId) {
        if (tenantId == null || tenantId.trim().length() == 0) {
            return DEFAULT_TENANT_ID;
        }
        String value = tenantId.trim();
        if (value.length() != 32) {
            throw new BusinessException(ErrorCode.VALIDATION_FAILED, "tenant.id.invalid");
        }
        return value;
    }
}
