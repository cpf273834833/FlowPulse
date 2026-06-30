package com.flowpulse.infrastructure.infrastructure.connector;

import com.flowpulse.infrastructure.domain.model.InfrastructureEntity;
import org.apache.kafka.clients.admin.AdminClient;
import org.apache.kafka.clients.admin.ListTopicsOptions;
import org.apache.kafka.common.KafkaFuture;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.List;
import java.util.Properties;
import java.util.Set;
import java.util.concurrent.TimeUnit;

@Component
public class KafkaInfrastructureConnector implements InfrastructureConnector {
    public static final String ZOOKEEPER_ENDPOINT_MESSAGE =
            "KAFKA_ZOOKEEPER_ENDPOINT: use Kafka broker bootstrap.servers instead of ZooKeeper address, for example 10.1.56.49:9092";

    @Override
    public boolean supports(String type) {
        return "KAFKA".equalsIgnoreCase(type);
    }

    @Override
    public ConnectionCheckResult test(InfrastructureEntity entity) {
        AdminClient client = null;
        try {
            if (looksLikeZooKeeper(entity.getEndpoint())) {
                return new ConnectionCheckResult(false, ZOOKEEPER_ENDPOINT_MESSAGE);
            }
            client = AdminClient.create(properties(entity));
            String clusterId = client.describeCluster().clusterId().get(10, TimeUnit.SECONDS);
            return new ConnectionCheckResult(true, "Kafka connection passed, clusterId=" + clusterId);
        } catch (Exception exception) {
            return new ConnectionCheckResult(false, readableMessage(exception));
        } finally {
            if (client != null) {
                client.close();
            }
        }
    }

    @Override
    public List<DiscoveredResource> discover(InfrastructureEntity entity) {
        AdminClient client = null;
        try {
            if (looksLikeZooKeeper(entity.getEndpoint())) {
                throw new IllegalStateException(ZOOKEEPER_ENDPOINT_MESSAGE);
            }
            client = AdminClient.create(properties(entity));
            KafkaFuture<Set<String>> future = client.listTopics(new ListTopicsOptions().listInternal(false)).names();
            Set<String> names = future.get(15, TimeUnit.SECONDS);
            List<DiscoveredResource> resources = new ArrayList<DiscoveredResource>();
            for (String name : names) {
                if (ResourceScopeMatcher.matches(entity.getSyncScope(), name)) {
                    resources.add(new DiscoveredResource("KAFKA_TOPIC", name, name, "ACTIVE", "{\"name\":\"" + escape(name) + "\"}"));
                }
            }
            return resources;
        } catch (Exception exception) {
            throw new IllegalStateException(readableMessage(exception), exception);
        } finally {
            if (client != null) {
                client.close();
            }
        }
    }

    private Properties properties(InfrastructureEntity entity) {
        Properties properties = new Properties();
        properties.put("bootstrap.servers", entity.getEndpoint());
        properties.put("client.id", "flowpulse-" + entity.getId());
        properties.put("request.timeout.ms", "10000");
        properties.put("default.api.timeout.ms", "10000");
        return properties;
    }

    private boolean looksLikeZooKeeper(String endpoint) {
        if (endpoint == null) {
            return false;
        }
        String[] nodes = endpoint.split(",");
        for (String node : nodes) {
            if (node.trim().endsWith(":2181")) {
                return true;
            }
        }
        return false;
    }

    private String readableMessage(Exception exception) {
        Throwable cursor = exception;
        while (cursor.getCause() != null) {
            cursor = cursor.getCause();
        }
        String message = cursor.getMessage();
        if (message == null || message.trim().length() == 0) {
            message = exception.getMessage();
        }
        return message == null || message.trim().length() == 0 ? exception.getClass().getSimpleName() : message;
    }

    private String escape(String value) {
        return value == null ? "" : value.replace("\\", "\\\\").replace("\"", "\\\"");
    }
}
