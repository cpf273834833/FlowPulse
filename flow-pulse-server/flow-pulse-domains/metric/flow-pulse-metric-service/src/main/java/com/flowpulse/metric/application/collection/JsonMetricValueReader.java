package com.flowpulse.metric.application.collection;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.stereotype.Component;

import java.util.Iterator;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Component
public class JsonMetricValueReader {
    private static final Pattern NUMBER_PATTERN = Pattern.compile("-?\\d+(\\.\\d+)?");

    private final ObjectMapper objectMapper;

    public JsonMetricValueReader(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
    }

    public double readValue(String text) {
        String value = text == null ? "" : text.trim();
        if (value.length() == 0) {
            throw new IllegalArgumentException("Collector output is empty.");
        }
        JsonNode json = tryReadJson(value);
        if (json != null) {
            return readJsonValue(json);
        }
        Matcher matcher = NUMBER_PATTERN.matcher(value);
        if (!matcher.find()) {
            throw new IllegalArgumentException("Collector output does not contain a numeric value.");
        }
        return Double.parseDouble(matcher.group());
    }

    public String readStringField(String jsonText, String fieldName) {
        JsonNode json = tryReadJson(jsonText);
        JsonNode value = json == null ? null : json.get(fieldName);
        return value == null || value.isNull() ? "" : value.asText();
    }

    public JsonNode readTree(String jsonText) {
        JsonNode json = tryReadJson(jsonText);
        return json == null ? objectMapper.createObjectNode() : json;
    }

    private JsonNode tryReadJson(String text) {
        if (text == null || text.trim().length() == 0) {
            return null;
        }
        try {
            return objectMapper.readTree(text);
        } catch (Exception ignored) {
            return null;
        }
    }

    private double readJsonValue(JsonNode node) {
        if (node.isNumber()) {
            return node.asDouble();
        }
        JsonNode value = node.get("value");
        if (value != null && value.isNumber()) {
            return value.asDouble();
        }
        if (value != null && value.isTextual()) {
            return Double.parseDouble(value.asText());
        }
        Iterator<JsonNode> values = node.elements();
        while (values.hasNext()) {
            JsonNode child = values.next();
            if (child.isNumber()) {
                return child.asDouble();
            }
        }
        throw new IllegalArgumentException("JSON collector output does not contain field value.");
    }
}
