package com.flowpulse.infrastructure.infrastructure.connector;

import com.flowpulse.infrastructure.domain.model.InfrastructureEntity;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.List;

@Component
public class ElasticsearchInfrastructureConnector extends HttpInfrastructureConnectorSupport {
    @Override
    public boolean supports(String type) {
        return "ELASTICSEARCH".equalsIgnoreCase(type);
    }

    @Override
    public ConnectionCheckResult test(InfrastructureEntity entity) {
        try {
            String body = get(entity, "/_cluster/health");
            return new ConnectionCheckResult(true, "Elasticsearch connection passed: " + trim(body));
        } catch (Exception exception) {
            return new ConnectionCheckResult(false, exception.getMessage());
        }
    }

    @Override
    public List<DiscoveredResource> discover(InfrastructureEntity entity) {
        try {
            String body = get(entity, "/_cat/indices?format=json&h=index,status,health");
            List<DiscoveredResource> resources = new ArrayList<DiscoveredResource>();
            String[] chunks = body.split("\\{");
            for (String chunk : chunks) {
                String index = value(chunk, "index");
                if (notBlank(index) && ResourceScopeMatcher.matches(entity.getSyncScope(), index)) {
                    String status = value(chunk, "status");
                    resources.add(new DiscoveredResource("ES_INDEX", index, index, notBlank(status) ? status : "UNKNOWN", "{" + trim(chunk)));
                }
            }
            return resources;
        } catch (Exception exception) {
            throw new IllegalStateException(exception.getMessage(), exception);
        }
    }

    private String value(String json, String field) {
        String token = "\"" + field + "\":\"";
        int start = json.indexOf(token);
        if (start < 0) {
            return "";
        }
        int valueStart = start + token.length();
        int end = json.indexOf("\"", valueStart);
        return end < 0 ? "" : json.substring(valueStart, end);
    }

    private String trim(String value) {
        return value == null || value.length() <= 240 ? value : value.substring(0, 240);
    }
}
