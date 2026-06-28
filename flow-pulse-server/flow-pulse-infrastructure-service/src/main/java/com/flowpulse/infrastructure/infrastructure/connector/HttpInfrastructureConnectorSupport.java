package com.flowpulse.infrastructure.infrastructure.connector;

import com.flowpulse.infrastructure.domain.model.InfrastructureEntity;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.util.Base64;

abstract class HttpInfrastructureConnectorSupport implements InfrastructureConnector {
    protected String get(InfrastructureEntity entity, String path) throws Exception {
        String base = normalizeBaseEndpoint(entity.getEndpoint());
        String url = base.endsWith("/") ? base.substring(0, base.length() - 1) + path : base + path;
        HttpURLConnection connection = (HttpURLConnection) new URL(url).openConnection();
        connection.setConnectTimeout(10000);
        connection.setReadTimeout(10000);
        connection.setRequestMethod("GET");
        if ("BASIC".equalsIgnoreCase(entity.getAuthType()) && notBlank(entity.getUsername())) {
            String token = entity.getUsername() + ":" + (entity.getPassword() == null ? "" : entity.getPassword());
            connection.setRequestProperty("Authorization", "Basic " + Base64.getEncoder().encodeToString(token.getBytes(StandardCharsets.UTF_8)));
        }
        int code = connection.getResponseCode();
        BufferedReader reader = new BufferedReader(new InputStreamReader(
                code >= 200 && code < 300 ? connection.getInputStream() : connection.getErrorStream(), StandardCharsets.UTF_8));
        StringBuilder builder = new StringBuilder();
        String line;
        while ((line = reader.readLine()) != null) {
            builder.append(line);
        }
        if (code < 200 || code >= 300) {
            throw new IllegalStateException("HTTP " + code + ": " + builder);
        }
        return builder.toString();
    }

    protected boolean notBlank(String value) {
        return value != null && value.trim().length() > 0;
    }

    private String normalizeBaseEndpoint(String endpoint) {
        String value = endpoint == null ? "" : endpoint.trim();
        if (value.startsWith("http://") || value.startsWith("https://")) {
            return value;
        }
        return "http://" + value;
    }
}
