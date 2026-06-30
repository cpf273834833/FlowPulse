package com.flowpulse.executor.infrastructure.omp;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.stereotype.Component;

import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;

@Component
public class OmpHostClient {
    private static final int PAGE_SIZE = 200;
    private static final int TIMEOUT_MS = 10000;
    private final ObjectMapper objectMapper;

    public OmpHostClient(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
    }

    public List<OmpHostRecord> queryHosts(String ompBaseUrl, String apiKey) {
        List<OmpHostRecord> result = new ArrayList<OmpHostRecord>();
        int pageIndex = 1;
        while (true) {
            JsonNode root = postPage(ompBaseUrl, apiKey, pageIndex);
            JsonNode data = findDataArray(root);
            if (data == null || !data.isArray()) {
                break;
            }
            int pageCount = 0;
            for (JsonNode item : data) {
                result.add(objectMapper.convertValue(item, OmpHostRecord.class));
                pageCount++;
            }
            int total = root.has("total") ? root.get("total").asInt() : result.size();
            if (pageCount < PAGE_SIZE || result.size() >= total) {
                break;
            }
            pageIndex++;
        }
        return result;
    }

    private JsonNode postPage(String ompBaseUrl, String apiKey, int pageIndex) {
        HttpURLConnection connection = null;
        try {
            URL url = new URL(normalizeUrl(ompBaseUrl) + "/omp/openapi/v1/hosts/query?apikey=" + apiKey);
            connection = (HttpURLConnection) url.openConnection();
            connection.setConnectTimeout(TIMEOUT_MS);
            connection.setReadTimeout(TIMEOUT_MS);
            connection.setRequestMethod("POST");
            connection.setDoOutput(true);
            connection.setRequestProperty("Content-Type", "application/json;charset=UTF-8");
            String body = "{\"pageIndex\":" + pageIndex + ",\"pageSize\":" + PAGE_SIZE + "}";
            OutputStream outputStream = connection.getOutputStream();
            outputStream.write(body.getBytes(StandardCharsets.UTF_8));
            outputStream.flush();
            outputStream.close();
            if (connection.getResponseCode() >= 400) {
                throw new IllegalStateException("OMP HTTP " + connection.getResponseCode());
            }
            return objectMapper.readTree(connection.getInputStream());
        } catch (Exception exception) {
            throw new IllegalStateException(exception.getMessage(), exception);
        } finally {
            if (connection != null) {
                connection.disconnect();
            }
        }
    }

    private JsonNode findDataArray(JsonNode root) {
        if (root == null) {
            return null;
        }
        if (root.has("data") && root.get("data").isArray()) {
            return root.get("data");
        }
        if (root.has("data") && root.get("data").has("data")) {
            return root.get("data").get("data");
        }
        if (root.has("result") && root.get("result").has("data")) {
            return root.get("result").get("data");
        }
        return null;
    }

    private String normalizeUrl(String url) {
        String value = url == null ? "" : url.trim();
        while (value.endsWith("/")) {
            value = value.substring(0, value.length() - 1);
        }
        return value;
    }
}
