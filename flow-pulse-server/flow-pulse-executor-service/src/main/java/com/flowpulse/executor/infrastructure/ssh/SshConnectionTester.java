package com.flowpulse.executor.infrastructure.ssh;

import com.flowpulse.executor.domain.model.ExecutorNodeEntity;
import com.jcraft.jsch.JSch;
import com.jcraft.jsch.Session;
import org.springframework.stereotype.Component;

import java.nio.charset.StandardCharsets;
import java.util.Properties;

@Component
public class SshConnectionTester {
    private static final int CONNECT_TIMEOUT_MS = 10000;
    private static final String AUTH_PASSWORD = "PASSWORD";
    private static final String AUTH_PRIVATE_KEY = "PRIVATE_KEY";

    public SshTestResult test(ExecutorNodeEntity node) {
        Session session = null;
        try {
            JSch jsch = new JSch();
            if (AUTH_PRIVATE_KEY.equals(node.getSshAuthType())) {
                byte[] privateKey = node.getSshPrivateKey().getBytes(StandardCharsets.UTF_8);
                jsch.addIdentity(node.getHost(), privateKey, null, null);
            }
            session = jsch.getSession(node.getSshUsername(), node.getHost(), node.getSshPort().intValue());
            if (AUTH_PASSWORD.equals(node.getSshAuthType())) {
                session.setPassword(node.getSshPassword());
            }
            Properties config = new Properties();
            config.put("StrictHostKeyChecking", "no");
            config.put("PreferredAuthentications", preferredAuthentications(node.getSshAuthType()));
            session.setConfig(config);
            session.connect(CONNECT_TIMEOUT_MS);
            return SshTestResult.success("SSH 连接测试通过");
        } catch (Exception exception) {
            return SshTestResult.failure(safeMessage(exception));
        } finally {
            if (session != null && session.isConnected()) {
                session.disconnect();
            }
        }
    }

    private String preferredAuthentications(String authType) {
        if (AUTH_PRIVATE_KEY.equals(authType)) {
            return "publickey";
        }
        return "password";
    }

    private String safeMessage(Exception exception) {
        String message = exception.getMessage();
        return message == null || message.trim().length() == 0 ? exception.getClass().getSimpleName() : message;
    }
}
