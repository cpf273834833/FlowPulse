package com.flowpulse.common;

public class BusinessException extends RuntimeException {
    private final ErrorCode errorCode;
    private final String messageKey;
    private final Object[] messageArgs;

    public BusinessException(ErrorCode errorCode) {
        this(errorCode, errorCode.getMessageKey());
    }

    public BusinessException(ErrorCode errorCode, String messageKey, Object... messageArgs) {
        super(messageKey);
        this.errorCode = errorCode;
        this.messageKey = messageKey;
        this.messageArgs = messageArgs == null ? new Object[0] : messageArgs.clone();
    }

    public ErrorCode getErrorCode() {
        return errorCode;
    }

    public String getMessageKey() {
        return messageKey;
    }

    public Object[] getMessageArgs() {
        return messageArgs.clone();
    }
}
