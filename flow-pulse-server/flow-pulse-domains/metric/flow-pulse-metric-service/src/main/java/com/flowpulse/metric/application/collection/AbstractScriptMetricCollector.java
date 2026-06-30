package com.flowpulse.metric.application.collection;

import com.flowpulse.metric.domain.model.MetricImplementationEntity;
import com.flowpulse.metric.domain.model.ResourceMetricConfigEntity;

import java.util.concurrent.TimeUnit;

public abstract class AbstractScriptMetricCollector implements MetricCollector {
    protected final JsonMetricValueReader valueReader;

    protected AbstractScriptMetricCollector(JsonMetricValueReader valueReader) {
        this.valueReader = valueReader;
    }

    protected boolean isScriptImplementation(MetricCollectContext context) {
        String type = context.getImplementation().getImplementationType();
        return "SHELL".equalsIgnoreCase(type) || "PYTHON".equalsIgnoreCase(type);
    }

    protected MetricCollectResult parseOutput(String output) {
        double value = valueReader.readValue(output);
        return MetricCollectResult.success(value, "Script metric collected.", "{\"source\":\"SCRIPT\"}");
    }

    protected int timeoutSeconds(MetricImplementationEntity implementation) {
        Integer timeout = implementation.getTimeoutSec();
        return timeout == null || timeout.intValue() <= 0 ? 30 : timeout.intValue();
    }

    protected String scriptContent(MetricImplementationEntity implementation) {
        String script = implementation.getScriptContent();
        if (script == null || script.trim().length() == 0) {
            throw new IllegalStateException("Script content is empty.");
        }
        return script;
    }

    protected String envValue(ResourceMetricConfigEntity config, String key) {
        if ("FP_TENANT_ID".equals(key)) {
            return config.getTenantId();
        }
        if ("FP_OBJECT_TYPE".equals(key)) {
            return config.getObjectType();
        }
        if ("FP_OBJECT_ID".equals(key)) {
            return config.getObjectId();
        }
        if ("FP_OBJECT_CODE".equals(key)) {
            return config.getObjectCode();
        }
        if ("FP_OBJECT_NAME".equals(key)) {
            return config.getObjectName();
        }
        if ("FP_PARAMETER_JSON".equals(key)) {
            return config.getParameterJson();
        }
        return "";
    }

    protected void waitFor(Process process, int timeoutSeconds) throws Exception {
        boolean finished = process.waitFor(timeoutSeconds, TimeUnit.SECONDS);
        if (!finished) {
            process.destroyForcibly();
            throw new IllegalStateException("Script execution timed out after " + timeoutSeconds + " seconds.");
        }
    }
}
