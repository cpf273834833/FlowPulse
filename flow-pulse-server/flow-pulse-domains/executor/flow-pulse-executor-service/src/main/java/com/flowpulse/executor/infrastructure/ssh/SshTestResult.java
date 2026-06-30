package com.flowpulse.executor.infrastructure.ssh;

public class SshTestResult {
    private final boolean success;
    private final String message;

    private SshTestResult(boolean success, String message) {
        this.success = success;
        this.message = message;
    }

    public static SshTestResult success(String message) {
        return new SshTestResult(true, message);
    }

    public static SshTestResult failure(String message) {
        return new SshTestResult(false, message);
    }

    public boolean isSuccess() {
        return success;
    }

    public String getMessage() {
        return message;
    }
}
