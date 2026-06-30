package com.flowpulse.infrastructure.infrastructure.connector;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.flowpulse.infrastructure.domain.model.InfrastructureEntity;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;

@Component
public class SparkInfrastructureConnector extends HttpInfrastructureConnectorSupport {
    private static final ObjectMapper OBJECT_MAPPER = new ObjectMapper();

    @Override
    public boolean supports(String type) {
        return "SPARK".equalsIgnoreCase(type);
    }

    @Override
    public ConnectionCheckResult test(InfrastructureEntity entity) {
        try {
            String body = get(entity, "/json");
            JsonNode root = OBJECT_MAPPER.readTree(body);
            int workers = root.path("aliveworkers").asInt(root.path("workers").size());
            int activeApps = root.path("activeapps").size();
            return new ConnectionCheckResult(true, "SPARK_CONNECTION_OK workers=" + workers + ", activeApps=" + activeApps);
        } catch (Exception exception) {
            return new ConnectionCheckResult(false, exception.getMessage());
        }
    }

    @Override
    public List<DiscoveredResource> discover(InfrastructureEntity entity) {
        try {
            JsonNode root = OBJECT_MAPPER.readTree(get(entity, "/json"));
            List<DiscoveredResource> resources = new ArrayList<DiscoveredResource>();
            collectWorkers(root.path("workers"), resources);
            collectApplications(entity, root.path("activeapps"), "RUNNING", resources);
            collectApplications(entity, root.path("completedapps"), "COMPLETED", resources);
            return resources;
        } catch (Exception exception) {
            throw new IllegalStateException(exception.getMessage(), exception);
        }
    }

    private void collectWorkers(JsonNode workers, List<DiscoveredResource> resources) {
        if (!workers.isArray()) {
            return;
        }
        Set<String> workerIds = new LinkedHashSet<String>();
        for (JsonNode worker : workers) {
            String id = worker.path("id").asText("");
            if (id.length() == 0 || !workerIds.add(id)) {
                continue;
            }
            String host = worker.path("host").asText(id);
            String status = worker.path("state").asText("UNKNOWN");
            resources.add(new DiscoveredResource("SPARK_WORKER", host, id, status, worker.toString()));
        }
    }

    private void collectApplications(InfrastructureEntity entity, JsonNode applications, String defaultStatus, List<DiscoveredResource> resources) {
        if (!applications.isArray()) {
            return;
        }
        Set<String> applicationIds = new LinkedHashSet<String>();
        for (JsonNode application : applications) {
            String id = application.path("id").asText("");
            String name = application.path("name").asText(id);
            if (id.length() == 0 || !applicationIds.add(id) || !ResourceScopeMatcher.matches(entity.getSyncScope(), name)) {
                continue;
            }
            String status = application.path("state").asText(defaultStatus);
            resources.add(new DiscoveredResource("SPARK_APPLICATION", name, id, status, application.toString()));
        }
    }

}
