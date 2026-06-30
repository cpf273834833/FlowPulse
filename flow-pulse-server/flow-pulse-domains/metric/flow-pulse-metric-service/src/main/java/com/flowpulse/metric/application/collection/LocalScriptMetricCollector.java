package com.flowpulse.metric.application.collection;

import com.flowpulse.metric.domain.model.MetricImplementationEntity;
import com.flowpulse.metric.domain.model.ResourceMetricConfigEntity;
import org.springframework.stereotype.Component;

import java.io.BufferedReader;
import java.io.File;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.util.ArrayList;
import java.util.List;

@Component
public class LocalScriptMetricCollector extends AbstractScriptMetricCollector {
    public LocalScriptMetricCollector(JsonMetricValueReader valueReader) {
        super(valueReader);
    }

    @Override
    public boolean supports(MetricCollectContext context) {
        return isScriptImplementation(context) && "SERVER".equalsIgnoreCase(context.getConfig().getExecutionMode());
    }

    @Override
    public MetricCollectResult collect(MetricCollectContext context) throws Exception {
        MetricImplementationEntity implementation = context.getImplementation();
        File script = writeScriptFile(implementation);
        try {
            ProcessBuilder builder = new ProcessBuilder(command(implementation, script));
            builder.redirectErrorStream(true);
            applyEnvironment(builder, context.getConfig());
            Process process = builder.start();
            String output = readOutput(process);
            waitFor(process, timeoutSeconds(implementation));
            if (process.exitValue() != 0) {
                throw new IllegalStateException("Script exited with code " + process.exitValue() + ": " + trim(output));
            }
            return parseOutput(output);
        } finally {
            Files.deleteIfExists(script.toPath());
        }
    }

    private File writeScriptFile(MetricImplementationEntity implementation) throws Exception {
        String suffix = "PYTHON".equalsIgnoreCase(implementation.getImplementationType()) ? ".py"
                : (isWindows() ? ".ps1" : ".sh");
        File file = File.createTempFile("flowpulse-metric-", suffix);
        Files.write(file.toPath(), scriptContent(implementation).getBytes(StandardCharsets.UTF_8));
        file.setExecutable(true);
        return file;
    }

    private List<String> command(MetricImplementationEntity implementation, File script) {
        List<String> command = new ArrayList<String>();
        if ("PYTHON".equalsIgnoreCase(implementation.getImplementationType())) {
            command.add("python");
            command.add(script.getAbsolutePath());
            return command;
        }
        if (isWindows()) {
            command.add("powershell");
            command.add("-NoProfile");
            command.add("-ExecutionPolicy");
            command.add("Bypass");
            command.add("-File");
            command.add(script.getAbsolutePath());
            return command;
        }
        command.add("/bin/sh");
        command.add(script.getAbsolutePath());
        return command;
    }

    private void applyEnvironment(ProcessBuilder builder, ResourceMetricConfigEntity config) {
        for (String key : new String[]{"FP_TENANT_ID", "FP_OBJECT_TYPE", "FP_OBJECT_ID", "FP_OBJECT_CODE", "FP_OBJECT_NAME", "FP_PARAMETER_JSON"}) {
            builder.environment().put(key, safe(envValue(config, key)));
        }
    }

    private String readOutput(Process process) throws Exception {
        StringBuilder output = new StringBuilder();
        BufferedReader reader = new BufferedReader(new InputStreamReader(process.getInputStream(), StandardCharsets.UTF_8));
        String line;
        while ((line = reader.readLine()) != null) {
            if (output.length() > 0) {
                output.append('\n');
            }
            output.append(line);
        }
        return output.toString();
    }

    private boolean isWindows() {
        return System.getProperty("os.name", "").toLowerCase().contains("win");
    }

    private String safe(String value) {
        return value == null ? "" : value;
    }

    private String trim(String value) {
        return value == null || value.length() <= 240 ? value : value.substring(0, 240);
    }
}
