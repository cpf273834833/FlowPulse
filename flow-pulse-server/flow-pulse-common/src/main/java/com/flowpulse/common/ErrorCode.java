package com.flowpulse.common;

public enum ErrorCode {
    VALIDATION_FAILED(400, "error.validation.failed"),
    RESOURCE_NOT_FOUND(404, "error.resource.not.found"),
    CONFLICT(409, "error.conflict"),
    BUSINESS_RULE_VIOLATED(422, "error.business.rule.violated"),
    INTERNAL_ERROR(500, "error.internal");

    private final int code;
    private final String messageKey;

    ErrorCode(int code, String messageKey) {
        this.code = code;
        this.messageKey = messageKey;
    }

    public int getCode() {
        return code;
    }

    public String getMessageKey() {
        return messageKey;
    }
}
