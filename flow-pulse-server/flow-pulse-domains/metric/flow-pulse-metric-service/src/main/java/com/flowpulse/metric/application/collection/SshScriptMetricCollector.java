package com.flowpulse.metric.application.collection;

import com.flowpulse.executor.domain.model.ExecutorNodeEntity;
import com.flowpulse.executor.infrastructure.persistence.mapper.ExecutorNodeMapper;
import com.flowpulse.metric.domain.model.MetricImplementationEntity;
import com.flowpulse.metric.domain.model.ResourceMetricConfigEntity;
import com.jcraft.jsch.ChannelExec;
import com.jcraft.jsch.JSch;
import com.jcraft.jsch.Session;
import org.springframework.stereotype.Component;

import java.io.ByteArrayOutputStream;
import java.nio.charset.StandardCharsets;
import java.util.Properties;

@Component
public class SshScriptMetricCollector extends AbstractScriptMetricCollector {
    private final ExecutorNodeMapper executorNodeMapper;

    public SshScriptMetricCollector(JsonMetricValueReader valueReader, ExecutorNodeMapper executorNodeMapper) {
        super(valueReader);
        this.executorNodeMapper = executorNodeMapper;
    }

    @Override
    public boolean supports(MetricCollectContext context) {
        return isScriptImplementation(context) && "SSH".equalsIgnoreCase(context.getConfig().getExecutionMode());
    }

    @Override
    public MetricCollectResult collect(MetricCollectContext context) throws Exception {
        ResourceMetricConfigEntity config = context.getConfig();
        MetricImplementationEntity implementation = context.getImplementation();
        ExecutorNodeEntity node = executorNodeMapper.selectById(config.getTenantId(), config.getExecutorNodeId());
        if (node == null || !Boolean.TRUE.equals(node.getSshSupported())) {
            throw new IllegalStateException("Executor node does not support SSH.");
        }

        JSch jsch = new JSch();
        if ("PRIVATE_KEY".equalsIgnoreCase(node.getSshAuthType()) && notBlank(node.getSshPrivateKey())) {
            jsch.addIdentity("flowpulse-" + node.getId(), node.getSshPrivateKey().getBytes(StandardCharsets.UTF_8), null, null);
        }
        Session session = jsch.getSession(node.getSshUsername(), node.getHost(), node.getSshPort() == null ? 22 : node.getSshPort().intValue());
        if (!"PRIVATE_KEY".equalsIgnoreCase(node.getSshAuthType())) {
            session.setPassword(node.getSshPassword());
        }
        Properties configProperties = new Properties();
        configProperties.put("StrictHostKeyChecking", "no");
        session.setConfig(configProperties);
        session.connect(timeoutSeconds(implementation) * 1000);
        try {
            String command = remoteCommand(implementation, config, node);
            ChannelExec channel = (ChannelExec) session.openChannel("exec");
            ByteArrayOutputStream output = new ByteArrayOutputStream();
            ByteArrayOutputStream error = new ByteArrayOutputStream();
            channel.setCommand(command);
            channel.setOutputStream(output);
            channel.setErrStream(error);
            channel.connect();
            waitChannel(channel, timeoutSeconds(implementation));
            String stdout = new String(output.toByteArray(), StandardCharsets.UTF_8);
            String stderr = new String(error.toByteArray(), StandardCharsets.UTF_8);
            int exitCode = channel.getExitStatus();
            channel.disconnect();
            if (exitCode != 0) {
                throw new IllegalStateException("SSH script exited with code " + exitCode + ": " + trim(stderr.length() > 0 ? stderr : stdout));
            }
            return parseOutput(stdout);
        } finally {
            session.disconnect();
        }
    }

    private String remoteCommand(MetricImplementationEntity implementation, ResourceMetricConfigEntity config, ExecutorNodeEntity node) {
        String script = scriptContent(implementation);
        String prefix = "export FP_TENANT_ID=" + shellQuote(config.getTenantId())
                + " FP_OBJECT_TYPE=" + shellQuote(config.getObjectType())
                + " FP_OBJECT_ID=" + shellQuote(config.getObjectId())
                + " FP_OBJECT_CODE=" + shellQuote(config.getObjectCode())
                + " FP_OBJECT_NAME=" + shellQuote(config.getObjectName())
                + " FP_PARAMETER_JSON=" + shellQuote(config.getParameterJson()) + "; ";
        if ("PYTHON".equalsIgnoreCase(implementation.getImplementationType())) {
            String python = notBlank(node.getPythonPath()) ? node.getPythonPath() : "python";
            return prefix + python + " - <<'FLOWPULSE_PY'\n" + script + "\nFLOWPULSE_PY";
        }
        return prefix + "sh -s <<'FLOWPULSE_SH'\n" + script + "\nFLOWPULSE_SH";
    }

    private void waitChannel(ChannelExec channel, int timeoutSeconds) throws Exception {
        long deadline = System.currentTimeMillis() + timeoutSeconds * 1000L;
        while (!channel.isClosed()) {
            if (System.currentTimeMillis() > deadline) {
                channel.disconnect();
                throw new IllegalStateException("SSH script execution timed out after " + timeoutSeconds + " seconds.");
            }
            Thread.sleep(100L);
        }
    }

    private String shellQuote(String value) {
        return "'" + (value == null ? "" : value.replace("'", "'\"'\"'")) + "'";
    }

    private boolean notBlank(String value) {
        return value != null && value.trim().length() > 0;
    }

    private String trim(String value) {
        return value == null || value.length() <= 240 ? value : value.substring(0, 240);
    }
}
