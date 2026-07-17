package com.flowpulse.metric.application.collection;

import org.springframework.stereotype.Component;

import java.time.Instant;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/** Stateless transformations and conditional operators for resolved parameters. */
@Component
public class MetricParameterValueTransformer {
    public String transform(String value, String transformType, String format, String outputFormat,
                            String prefix, String suffix, String regex, int groupIndex) {
        String type = defaultText(transformType, hasText(format) ? "TIME_FORMAT" : "NONE");
        if ("TIME_FORMAT".equalsIgnoreCase(type)) return formatTime(value, defaultText(outputFormat, format));
        if ("CONCAT".equalsIgnoreCase(type)) return defaultText(prefix, "") + defaultText(value, "") + defaultText(suffix, "");
        if ("REGEX_EXTRACT".equalsIgnoreCase(type)) return regexExtract(value, regex, groupIndex);
        return defaultText(value, "");
    }

    public boolean matches(String value, String operatorValue, String compareValue) {
        String operator = defaultText(operatorValue, "NONE");
        if (!hasText(compareValue) || "NONE".equalsIgnoreCase(operator)) return hasText(value);
        if ("==".equals(operator)) return value.equals(compareValue);
        if ("!=".equals(operator)) return !value.equals(compareValue);
        if ("CONTAINS".equalsIgnoreCase(operator)) return value.contains(compareValue);
        if ("STARTS_WITH".equalsIgnoreCase(operator)) return value.startsWith(compareValue);
        if ("REGEX".equalsIgnoreCase(operator)) return Pattern.compile(compareValue).matcher(value).find();
        try {
            double left = Double.parseDouble(value);
            double right = Double.parseDouble(compareValue);
            if (">".equals(operator)) return left > right;
            if (">=".equals(operator)) return left >= right;
            if ("<".equals(operator)) return left < right;
            if ("<=".equals(operator)) return left <= right;
        } catch (NumberFormatException ignored) {
            return true;
        }
        return true;
    }

    private String regexExtract(String value, String regex, int groupIndex) {
        if (!hasText(regex)) return defaultText(value, "");
        Matcher matcher = Pattern.compile(regex).matcher(value == null ? "" : value);
        if (!matcher.find()) return "";
        int index = groupIndex < 0 ? 0 : groupIndex;
        return matcher.groupCount() >= index ? matcher.group(index) : matcher.group();
    }

    private String formatTime(String value, String format) {
        if (!hasText(format)) return defaultText(value, "");
        try {
            String pattern = hasText(format) ? format : "yyyyMMddHHmmss";
            return DateTimeFormatter.ofPattern(pattern)
                    .format(Instant.ofEpochMilli(Long.parseLong(value)).atZone(ZoneId.systemDefault()));
        } catch (NumberFormatException ignored) {
            return defaultText(value, "");
        }
    }

    private String defaultText(String value, String fallback) { return hasText(value) ? value : fallback; }
    private boolean hasText(String value) { return value != null && value.trim().length() > 0; }
}
