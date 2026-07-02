package com.flowpulse.metric.application.collection;

import org.springframework.stereotype.Component;

@Component
public class ExpressionMetricCollector implements MetricCollector {
    private final JsonMetricValueReader valueReader;

    public ExpressionMetricCollector(JsonMetricValueReader valueReader) {
        this.valueReader = valueReader;
    }

    @Override
    public boolean supports(MetricCollectContext context) {
        return "EXPRESSION".equalsIgnoreCase(context.getImplementation().getImplementationType())
                || "EXPRESSION".equalsIgnoreCase(context.getConfig().getExecutionMode());
    }

    @Override
    public MetricCollectResult collect(MetricCollectContext context) {
        String valueExpression = firstNotBlank(
                valueReader.readStringField(context.getConfig().getParameterJson(), "value"),
                "",
                context.getImplementation().getScriptContent());
        double value = valueReader.readValue(valueExpression);
        return MetricCollectResult.success(value, "Expression metric collected.", "{\"source\":\"EXPRESSION\"}");
    }

    private String firstNotBlank(String first, String second, String third) {
        if (notBlank(first)) {
            return first;
        }
        if (notBlank(second)) {
            return second;
        }
        return third;
    }

    private boolean notBlank(String value) {
        return value != null && value.trim().length() > 0;
    }
}
