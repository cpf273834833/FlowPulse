package com.flowpulse.metric.application.collection;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.node.MissingNode;
import com.flowpulse.infrastructure.domain.model.InfrastructureEntity;
import com.flowpulse.infrastructure.domain.model.InfrastructureResourceEntity;
import com.flowpulse.infrastructure.infrastructure.persistence.mapper.InfrastructureMapper;
import com.flowpulse.infrastructure.infrastructure.persistence.mapper.InfrastructureResourceMapper;
import com.flowpulse.metric.domain.model.MetricImplementationEntity;
import com.flowpulse.metric.domain.model.MetricSampleEntity;
import com.flowpulse.metric.domain.model.ResourceMetricConfigEntity;
import com.flowpulse.metric.infrastructure.persistence.mapper.MetricSampleMapper;
import com.flowpulse.topology.domain.model.TopologyEdgeEntity;
import com.flowpulse.topology.domain.model.TopologyNodeEntity;
import com.flowpulse.topology.infrastructure.persistence.mapper.TopologyEdgeMapper;
import com.flowpulse.topology.infrastructure.persistence.mapper.TopologyNodeMapper;
import org.apache.kafka.clients.admin.AdminClient;
import org.apache.kafka.clients.admin.ConsumerGroupDescription;
import org.apache.kafka.clients.admin.DescribeTopicsResult;
import org.apache.kafka.clients.admin.ListConsumerGroupOffsetsResult;
import org.apache.kafka.clients.admin.ListOffsetsResult;
import org.apache.kafka.clients.admin.OffsetSpec;
import org.apache.kafka.clients.admin.TopicDescription;
import org.apache.kafka.clients.consumer.OffsetAndMetadata;
import org.apache.kafka.common.TopicPartition;
import org.springframework.stereotype.Component;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.util.Base64;
import java.util.Collections;
import java.util.HashMap;
import java.util.Locale;
import java.util.Map;
import java.util.Properties;
import java.util.concurrent.TimeUnit;

@Component
public class BuiltInMetricCollector implements MetricCollector {
    private final InfrastructureMapper infrastructureMapper;
    private final InfrastructureResourceMapper resourceMapper;
    private final TopologyNodeMapper topologyNodeMapper;
    private final TopologyEdgeMapper topologyEdgeMapper;
    private final MetricSampleMapper sampleMapper;
    private final JsonMetricValueReader valueReader;

    public BuiltInMetricCollector(InfrastructureMapper infrastructureMapper,
                                  InfrastructureResourceMapper resourceMapper,
                                  TopologyNodeMapper topologyNodeMapper,
                                  TopologyEdgeMapper topologyEdgeMapper,
                                  MetricSampleMapper sampleMapper,
                                  JsonMetricValueReader valueReader) {
        this.infrastructureMapper = infrastructureMapper;
        this.resourceMapper = resourceMapper;
        this.topologyNodeMapper = topologyNodeMapper;
        this.topologyEdgeMapper = topologyEdgeMapper;
        this.sampleMapper = sampleMapper;
        this.valueReader = valueReader;
    }

    @Override
    public boolean supports(MetricCollectContext context) {
        return "BUILT_IN".equalsIgnoreCase(context.getImplementation().getImplementationType());
    }

    @Override
    public MetricCollectResult collect(MetricCollectContext context) throws Exception {
        ResourceMetricConfigEntity config = context.getConfig();
        MetricImplementationEntity implementation = context.getImplementation();
        String collector = normalize(firstNotBlank(implementation.getBuiltInCollector(),
                implementation.getMetricCode(),
                ""));

        if ("CONSTANT".equals(collector) || "STATIC_VALUE".equals(collector)) {
            double value = valueReader.readValue(firstNotBlank(
                    valueReader.readStringField(context.getResolvedParameterJson(), "value"),
                    "",
                    "0"));
            return MetricCollectResult.success(value, "Built-in constant metric collected.", "{\"source\":\"BUILT_IN\"}");
        }
        if ("KAFKA_TOPIC_MESSAGE_RATE".equals(collector)) {
            return collectKafkaTopicMessageRate(context);
        }
        if ("KAFKA_GROUP_LAG_TOTAL".equals(collector)) {
            return collectKafkaTopicLag(context);
        }
        if ("KAFKA_GROUP_ACTIVE_MEMBERS".equals(collector)) {
            return collectKafkaActiveMembers(context);
        }
        if ("KAFKA_GROUP_LAST_COMMIT_TIME".equals(collector)) {
            return collectKafkaLastCommitObservedAt(context);
        }
        if ("SPARK_APPLICATION_STATUS".equals(collector)) {
            return collectSparkApplicationStatus(context);
        }
        if ("SPARK_APPLICATION_START_TIME".equals(collector)) {
            return collectSparkApplicationStartTime(context);
        }
        if ("SPARK_EXECUTOR_COUNT".equals(collector)) {
            return collectSparkExecutorCount(context);
        }
        if ("SPARK_BACKLOG_QUEUE_COUNT".equals(collector)) {
            return collectSparkBacklogQueueCount(context);
        }
        if ("ES_INDEX_DOC_GROWTH_RATE".equals(collector)) {
            return collectEsIndexDocGrowthRate(context);
        }
        if ("ES_CLUSTER_HEALTH_STATUS".equals(collector)) {
            return collectEsClusterHealth(context);
        }
        if (collector.contains("RESOURCE_COUNT")) {
            return collectResourceCount(config);
        }
        if (collector.contains("SYNC_DELAY") || collector.contains("SYNC_LAG")) {
            return collectSyncDelay(config);
        }
        if (collector.contains("CONNECTION") || collector.contains("AVAILABLE") || collector.contains("STATUS")) {
            return collectConnectionStatus(config);
        }
        if (config.getObjectType() != null && config.getObjectType().endsWith("_RESOURCE")) {
            return collectResourceStatus(config);
        }
        return collectConnectionStatus(config);
    }

    private MetricCollectResult collectKafkaTopicLag(MetricCollectContext context) throws Exception {
        ResourceMetricConfigEntity config = context.getConfig();
        KafkaLagTarget target = resolveKafkaLagTarget(config);
        JsonNode parameter = valueReader.readTree(context.getResolvedParameterJson());
        String topic = firstNotBlank(text(parameter, "topic"), target.topicCode, config.getObjectCode());
        if (!notBlank(topic)) {
            throw new IllegalStateException("Kafka lag topic is empty.");
        }

        String configuredGroupId = firstNotBlank(text(parameter, "groupId"), text(parameter, "consumerGroupId"), text(parameter, "consumerGroup"));
        if (!notBlank(configuredGroupId)) {
            throw new IllegalStateException("Kafka lag groupId is required. Create one metric task per groupId.");
        }
        AdminClient client = AdminClient.create(kafkaProperties(target.infrastructure));
        try {
            double lag = lagForGroupTopic(client, configuredGroupId, topic);
            String metadata = "{\"source\":\"BUILT_IN\",\"collector\":\"KAFKA_TOPIC_LAG\",\"topic\":\""
                    + escape(topic) + "\",\"groupId\":\"" + escape(configuredGroupId) + "\"}";
            return MetricCollectResult.success(lag, "Kafka topic lag collected, groupId=" + configuredGroupId + ".", metadata);
        } finally {
            client.close();
        }
    }

    private MetricCollectResult collectKafkaTopicMessageRate(MetricCollectContext context) throws Exception {
        ResourceMetricConfigEntity config = context.getConfig();
        KafkaLagTarget target = resolveKafkaLagTarget(config);
        JsonNode parameter = valueReader.readTree(context.getResolvedParameterJson());
        String topic = firstNotBlank(text(parameter, "topic"), target.topicCode, config.getObjectCode());
        if (!notBlank(topic)) {
            throw new IllegalStateException("Kafka topic is empty.");
        }
        long now = System.currentTimeMillis();
        AdminClient client = AdminClient.create(kafkaProperties(target.infrastructure));
        try {
            long offset = latestTopicOffset(client, topic);
            double rate = deltaPerSecond(context.getConfig(), "offset", offset, now);
            String metadata = "{\"source\":\"BUILT_IN\",\"collector\":\"KAFKA_TOPIC_MESSAGE_RATE\",\"topic\":\""
                    + escape(topic) + "\",\"offset\":" + offset + "}";
            return MetricCollectResult.success(rate, "Kafka topic message rate collected.", metadata);
        } finally {
            client.close();
        }
    }

    private MetricCollectResult collectKafkaActiveMembers(MetricCollectContext context) throws Exception {
        KafkaLagTarget target = resolveKafkaLagTarget(context.getConfig());
        JsonNode parameter = valueReader.readTree(context.getResolvedParameterJson());
        String groupId = requiredGroupId(parameter);
        AdminClient client = AdminClient.create(kafkaProperties(target.infrastructure));
        try {
            ConsumerGroupDescription description = client.describeConsumerGroups(Collections.singleton(groupId))
                    .describedGroups().get(groupId).get(15, TimeUnit.SECONDS);
            int members = description == null ? 0 : description.members().size();
            return MetricCollectResult.success(members, "Kafka consumer group active member count collected.",
                    "{\"source\":\"BUILT_IN\",\"collector\":\"KAFKA_GROUP_ACTIVE_MEMBERS\",\"groupId\":\"" + escape(groupId) + "\"}");
        } finally {
            client.close();
        }
    }

    private MetricCollectResult collectKafkaLastCommitObservedAt(MetricCollectContext context) throws Exception {
        KafkaLagTarget target = resolveKafkaLagTarget(context.getConfig());
        JsonNode parameter = valueReader.readTree(context.getResolvedParameterJson());
        String groupId = requiredGroupId(parameter);
        AdminClient client = AdminClient.create(kafkaProperties(target.infrastructure));
        try {
            Map<TopicPartition, OffsetAndMetadata> committed = client.listConsumerGroupOffsets(groupId)
                    .partitionsToOffsetAndMetadata().get(15, TimeUnit.SECONDS);
            double observedAt = committed == null || committed.isEmpty() ? 0D : System.currentTimeMillis();
            return MetricCollectResult.success(observedAt, "Kafka consumer group last commit observed time collected.",
                    "{\"source\":\"BUILT_IN\",\"collector\":\"KAFKA_GROUP_LAST_COMMIT_TIME\",\"groupId\":\"" + escape(groupId) + "\"}");
        } finally {
            client.close();
        }
    }

    private MetricCollectResult collectSparkApplicationStatus(MetricCollectContext context) throws Exception {
        SparkTarget target = resolveSparkTarget(context.getConfig());
        JsonNode application = findSparkApplication(target);
        String state = application.path("state").asText(target.resource == null ? "" : target.resource.getStatus());
        double value = "RUNNING".equalsIgnoreCase(state) ? 1D : 0D;
        return MetricCollectResult.success(value, "Spark application status collected.",
                "{\"source\":\"BUILT_IN\",\"collector\":\"SPARK_APPLICATION_STATUS\",\"state\":\"" + escape(state) + "\"}");
    }

    private MetricCollectResult collectSparkApplicationStartTime(MetricCollectContext context) throws Exception {
        SparkTarget target = resolveSparkTarget(context.getConfig());
        JsonNode application = findSparkApplication(target);
        long startTime = firstLong(application, "starttime", "startTime", "start_time");
        return MetricCollectResult.success(startTime, "Spark application start time collected.",
                "{\"source\":\"BUILT_IN\",\"collector\":\"SPARK_APPLICATION_START_TIME\",\"application\":\"" + escape(target.applicationName) + "\"}");
    }

    private MetricCollectResult collectSparkExecutorCount(MetricCollectContext context) throws Exception {
        SparkTarget target = resolveSparkTarget(context.getConfig());
        JsonNode application = findSparkApplication(target);
        int executors = countSparkStandaloneExecutors(target, application);
        if (executors < 0) {
            executors = firstInt(application, "executors", "executorCount", "executor_count");
        }
        if (executors < 0) {
            executors = Math.max(0, application.path("allocatedmb").asInt(0) > 0 ? 1 : 0);
        }
        return MetricCollectResult.success(executors, "Spark executor count collected.",
                "{\"source\":\"BUILT_IN\",\"collector\":\"SPARK_EXECUTOR_COUNT\",\"application\":\"" + escape(target.applicationName) + "\"}");
    }

    private MetricCollectResult collectSparkBacklogQueueCount(MetricCollectContext context) throws Exception {
        InfrastructureEntity infrastructure = requireInfrastructure(context.getConfig());
        JsonNode root = valueReader.readTree(httpGet(infrastructure, "/json"));
        int waiting = root.path("waitingapps").isArray() ? root.path("waitingapps").size() : 0;
        if (waiting == 0 && root.path("activeapps").isArray()) {
            for (JsonNode app : root.path("activeapps")) {
                String state = app.path("state").asText("");
                if ("WAITING".equalsIgnoreCase(state) || "SUBMITTED".equalsIgnoreCase(state)) {
                    waiting++;
                }
            }
        }
        return MetricCollectResult.success(waiting, "Spark backlog queue count collected.",
                "{\"source\":\"BUILT_IN\",\"collector\":\"SPARK_BACKLOG_QUEUE_COUNT\"}");
    }

    private MetricCollectResult collectEsIndexDocGrowthRate(MetricCollectContext context) throws Exception {
        ResourceMetricConfigEntity config = context.getConfig();
        InfrastructureResourceEntity resource = resourceMapper.selectById(config.getTenantId(), config.getObjectId());
        if (resource == null) {
            throw new IllegalStateException("Elasticsearch index resource does not exist.");
        }
        InfrastructureEntity infrastructure = infrastructureMapper.selectById(config.getTenantId(), resource.getInfrastructureId());
        if (infrastructure == null) {
            throw new IllegalStateException("Elasticsearch infrastructure does not exist.");
        }
        String index = firstNotBlank(text(valueReader.readTree(context.getResolvedParameterJson()), "index"), resource.getResourceCode(), config.getObjectCode());
        long now = System.currentTimeMillis();
        JsonNode root = valueReader.readTree(httpGet(infrastructure, "/" + encodePath(index) + "/_count"));
        long count = root.path("count").asLong(0L);
        double rate = deltaPerSecond(config, "docCount", count, now);
        String metadata = "{\"source\":\"BUILT_IN\",\"collector\":\"ES_INDEX_DOC_GROWTH_RATE\",\"index\":\""
                + escape(index) + "\",\"docCount\":" + count + "}";
        return MetricCollectResult.success(rate, "Elasticsearch index document growth rate collected.", metadata);
    }

    private MetricCollectResult collectEsClusterHealth(MetricCollectContext context) throws Exception {
        InfrastructureEntity infrastructure = requireInfrastructure(context.getConfig());
        JsonNode root = valueReader.readTree(httpGet(infrastructure, "/_cluster/health"));
        String status = root.path("status").asText("unknown");
        double value = "green".equalsIgnoreCase(status) ? 0D : ("yellow".equalsIgnoreCase(status) ? 1D : ("red".equalsIgnoreCase(status) ? 2D : 3D));
        return MetricCollectResult.success(value, "Elasticsearch cluster health collected.",
                "{\"source\":\"BUILT_IN\",\"collector\":\"ES_CLUSTER_HEALTH_STATUS\",\"status\":\"" + escape(status) + "\"}");
    }

    private KafkaLagTarget resolveKafkaLagTarget(ResourceMetricConfigEntity config) {
        if ("TOPOLOGY_EDGE".equalsIgnoreCase(config.getObjectType())) {
            TopologyEdgeEntity edge = topologyEdgeMapper.selectById(config.getTenantId(), config.getObjectId());
            if (edge == null) {
                throw new IllegalStateException("Topology edge does not exist.");
            }
            TopologyNodeEntity sourceNode = topologyNodeMapper.selectById(config.getTenantId(), edge.getSourceNodeId());
            if (sourceNode == null) {
                throw new IllegalStateException("Topology source node does not exist.");
            }
            InfrastructureResourceEntity topic = resourceMapper.selectById(config.getTenantId(), sourceNode.getObjectId());
            if (topic == null) {
                throw new IllegalStateException("Kafka topic resource does not exist.");
            }
            InfrastructureEntity infrastructure = infrastructureMapper.selectById(config.getTenantId(), topic.getInfrastructureId());
            if (infrastructure == null) {
                throw new IllegalStateException("Kafka infrastructure does not exist.");
            }
            return new KafkaLagTarget(infrastructure, topic.getResourceCode());
        }
        InfrastructureResourceEntity resource = resourceMapper.selectById(config.getTenantId(), config.getObjectId());
        if (resource == null) {
            throw new IllegalStateException("Kafka topic resource does not exist.");
        }
        InfrastructureEntity infrastructure = infrastructureMapper.selectById(config.getTenantId(), resource.getInfrastructureId());
        if (infrastructure == null) {
            throw new IllegalStateException("Kafka infrastructure does not exist.");
        }
        return new KafkaLagTarget(infrastructure, resource.getResourceCode());
    }

    private double lagForGroupTopic(AdminClient client, String groupId, String topic) throws Exception {
        ListConsumerGroupOffsetsResult offsetsResult = client.listConsumerGroupOffsets(groupId);
        Map<TopicPartition, OffsetAndMetadata> committed = offsetsResult.partitionsToOffsetAndMetadata().get(15, TimeUnit.SECONDS);
        Map<TopicPartition, OffsetSpec> latestRequests = new HashMap<TopicPartition, OffsetSpec>();
        for (TopicPartition partition : committed.keySet()) {
            if (topic.equals(partition.topic())) {
                latestRequests.put(partition, OffsetSpec.latest());
            }
        }
        if (latestRequests.isEmpty()) {
            return 0D;
        }
        Map<TopicPartition, ListOffsetsResult.ListOffsetsResultInfo> latest = client.listOffsets(latestRequests).all().get(15, TimeUnit.SECONDS);
        long lag = 0L;
        for (Map.Entry<TopicPartition, OffsetSpec> ignored : latestRequests.entrySet()) {
            TopicPartition partition = ignored.getKey();
            OffsetAndMetadata committedOffset = committed.get(partition);
            ListOffsetsResult.ListOffsetsResultInfo latestOffset = latest.get(partition);
            if (committedOffset != null && latestOffset != null) {
                lag += Math.max(0L, latestOffset.offset() - committedOffset.offset());
            }
        }
        return lag;
    }

    private long latestTopicOffset(AdminClient client, String topic) throws Exception {
        DescribeTopicsResult descriptionResult = client.describeTopics(Collections.singleton(topic));
        TopicDescription description = descriptionResult.allTopicNames().get(15, TimeUnit.SECONDS).get(topic);
        Map<TopicPartition, OffsetSpec> latestRequests = new HashMap<TopicPartition, OffsetSpec>();
        if (description != null) {
            for (org.apache.kafka.common.TopicPartitionInfo partition : description.partitions()) {
                latestRequests.put(new TopicPartition(topic, partition.partition()), OffsetSpec.latest());
            }
        }
        if (latestRequests.isEmpty()) {
            return 0L;
        }
        Map<TopicPartition, ListOffsetsResult.ListOffsetsResultInfo> latest = client.listOffsets(latestRequests).all().get(15, TimeUnit.SECONDS);
        long total = 0L;
        for (ListOffsetsResult.ListOffsetsResultInfo info : latest.values()) {
            total += info.offset();
        }
        return total;
    }

    private Properties kafkaProperties(InfrastructureEntity infrastructure) {
        Properties properties = new Properties();
        properties.put("bootstrap.servers", infrastructure.getEndpoint());
        properties.put("client.id", "flowpulse-metric-" + infrastructure.getId());
        properties.put("request.timeout.ms", "10000");
        properties.put("default.api.timeout.ms", "10000");
        return properties;
    }

    private MetricCollectResult collectResourceCount(ResourceMetricConfigEntity config) {
        String infrastructureId = resolveInfrastructureId(config);
        int count = resourceMapper.countByInfrastructureId(config.getTenantId(), infrastructureId);
        return MetricCollectResult.success(count, "Infrastructure resource count collected.", "{\"source\":\"BUILT_IN\"}");
    }

    private MetricCollectResult collectSyncDelay(ResourceMetricConfigEntity config) {
        InfrastructureEntity infrastructure = requireInfrastructure(config);
        Long lastSyncAt = infrastructure.getLastSyncAt();
        double value = lastSyncAt == null ? -1D : Math.max(0D, (System.currentTimeMillis() - lastSyncAt.longValue()) / 1000D);
        return MetricCollectResult.success(value, "Infrastructure sync delay collected.", "{\"source\":\"BUILT_IN\"}");
    }

    private MetricCollectResult collectConnectionStatus(ResourceMetricConfigEntity config) {
        InfrastructureEntity infrastructure = requireInfrastructure(config);
        double value = "NORMAL".equalsIgnoreCase(infrastructure.getConnectionStatus()) ? 1D : 0D;
        return MetricCollectResult.success(value, "Infrastructure connection status collected.", "{\"source\":\"BUILT_IN\"}");
    }

    private MetricCollectResult collectResourceStatus(ResourceMetricConfigEntity config) {
        InfrastructureResourceEntity resource = resourceMapper.selectById(config.getTenantId(), config.getObjectId());
        if (resource == null) {
            throw new IllegalStateException("Infrastructure resource does not exist.");
        }
        String status = resource.getStatus() == null ? "" : resource.getStatus();
        double value = ("ACTIVE".equalsIgnoreCase(status) || "OPEN".equalsIgnoreCase(status)
                || "GREEN".equalsIgnoreCase(status) || "YELLOW".equalsIgnoreCase(status)) ? 1D : 0D;
        return MetricCollectResult.success(value, "Infrastructure resource status collected.", "{\"source\":\"BUILT_IN\"}");
    }

    private InfrastructureEntity requireInfrastructure(ResourceMetricConfigEntity config) {
        InfrastructureEntity infrastructure = infrastructureMapper.selectById(config.getTenantId(), resolveInfrastructureId(config));
        if (infrastructure == null) {
            throw new IllegalStateException("Infrastructure does not exist.");
        }
        return infrastructure;
    }

    private String resolveInfrastructureId(ResourceMetricConfigEntity config) {
        if ("INFRASTRUCTURE".equalsIgnoreCase(config.getObjectType())) {
            return config.getObjectId();
        }
        InfrastructureResourceEntity resource = resourceMapper.selectById(config.getTenantId(), config.getObjectId());
        if (resource == null) {
            throw new IllegalStateException("Infrastructure resource does not exist.");
        }
        return resource.getInfrastructureId();
    }

    private SparkTarget resolveSparkTarget(ResourceMetricConfigEntity config) {
        InfrastructureResourceEntity resource = null;
        InfrastructureEntity infrastructure;
        if ("INFRASTRUCTURE".equalsIgnoreCase(config.getObjectType())) {
            infrastructure = requireInfrastructure(config);
        } else {
            resource = resourceMapper.selectById(config.getTenantId(), config.getObjectId());
            if (resource == null) {
                throw new IllegalStateException("Spark application resource does not exist.");
            }
            infrastructure = infrastructureMapper.selectById(config.getTenantId(), resource.getInfrastructureId());
            if (infrastructure == null) {
                throw new IllegalStateException("Spark infrastructure does not exist.");
            }
        }
        String name = resource == null ? "" : firstNotBlank(resource.getResourceName(), resource.getResourceCode(), "");
        String id = resource == null ? "" : resource.getResourceCode();
        return new SparkTarget(infrastructure, resource, name, id);
    }

    private JsonNode findSparkApplication(SparkTarget target) throws Exception {
        JsonNode root = valueReader.readTree(httpGet(target.infrastructure, "/json"));
        JsonNode found = findSparkApplication(root.path("activeapps"), target);
        if (!found.isMissingNode()) {
            return found;
        }
        found = findSparkApplication(root.path("completedapps"), target);
        if (!found.isMissingNode()) {
            return found;
        }
        if (target.resource != null) {
            JsonNode fallback = valueReader.readTree(target.resource.getMetadataJson());
            if (fallback.size() > 0) {
                return fallback;
            }
        }
        throw new IllegalStateException("Spark application does not exist.");
    }

    private JsonNode findSparkApplication(JsonNode applications, SparkTarget target) {
        if (!applications.isArray()) {
            return MissingNode.getInstance();
        }
        for (JsonNode application : applications) {
            String id = application.path("id").asText("");
            String name = application.path("name").asText("");
            if ((notBlank(target.applicationId) && target.applicationId.equals(id))
                    || (notBlank(target.applicationName) && target.applicationName.equals(name))) {
                return application;
            }
        }
        return MissingNode.getInstance();
    }

    private int countSparkStandaloneExecutors(SparkTarget target, JsonNode application) throws Exception {
        String applicationId = firstNotBlank(application.path("id").asText(""), target.applicationId, "");
        String applicationName = firstNotBlank(application.path("name").asText(""), target.applicationName, "");
        JsonNode master = valueReader.readTree(httpGet(target.infrastructure, "/json"));
        JsonNode workers = master.path("workers");
        if (!workers.isArray()) {
            return -1;
        }
        int count = 0;
        boolean workerJsonAvailable = false;
        for (JsonNode worker : workers) {
            String webUiAddress = text(worker, "webuiaddress");
            if (!notBlank(webUiAddress)) {
                continue;
            }
            try {
                JsonNode workerRoot = valueReader.readTree(httpGetUrl(target.infrastructure, trimTrailingSlash(webUiAddress) + "/json"));
                workerJsonAvailable = true;
                JsonNode executors = workerRoot.path("executors");
                if (!executors.isArray()) {
                    continue;
                }
                for (JsonNode executor : executors) {
                    String executorAppId = firstNotBlank(text(executor, "appid"), text(executor, "appId"), text(executor, "app_id"));
                    String executorAppName = executor.path("appdesc").path("name").asText("");
                    if ((notBlank(applicationId) && applicationId.equals(executorAppId))
                            || (notBlank(applicationName) && applicationName.equals(executorAppName))) {
                        count++;
                    }
                }
            } catch (Exception ignored) {
                // A single Worker Web UI may be unreachable while the Master is healthy; keep collecting from other workers.
            }
        }
        return workerJsonAvailable ? count : -1;
    }

    private String httpGet(InfrastructureEntity infrastructure, String path) throws Exception {
        String base = normalizeBaseEndpoint(infrastructure.getEndpoint());
        String url = base.endsWith("/") ? base.substring(0, base.length() - 1) + path : base + path;
        return httpGetUrl(infrastructure, url);
    }

    private String httpGetUrl(InfrastructureEntity infrastructure, String url) throws Exception {
        HttpURLConnection connection = (HttpURLConnection) new URL(url).openConnection();
        connection.setConnectTimeout(10000);
        connection.setReadTimeout(10000);
        connection.setRequestMethod("GET");
        if ("BASIC".equalsIgnoreCase(infrastructure.getAuthType()) && notBlank(infrastructure.getUsername())) {
            String token = infrastructure.getUsername() + ":" + (infrastructure.getPassword() == null ? "" : infrastructure.getPassword());
            connection.setRequestProperty("Authorization", "Basic " + Base64.getEncoder().encodeToString(token.getBytes(StandardCharsets.UTF_8)));
        }
        int code = connection.getResponseCode();
        BufferedReader reader = new BufferedReader(new InputStreamReader(
                code >= 200 && code < 300 ? connection.getInputStream() : connection.getErrorStream(), StandardCharsets.UTF_8));
        try {
            StringBuilder builder = new StringBuilder();
            String line;
            while ((line = reader.readLine()) != null) {
                builder.append(line);
            }
            if (code < 200 || code >= 300) {
                throw new IllegalStateException("HTTP " + code + ": " + builder);
            }
            return builder.toString();
        } finally {
            reader.close();
        }
    }

    private String trimTrailingSlash(String value) {
        String text = value == null ? "" : value.trim();
        while (text.endsWith("/")) {
            text = text.substring(0, text.length() - 1);
        }
        return text;
    }

    private double deltaPerSecond(ResourceMetricConfigEntity config, String metadataField, long currentValue, long now) {
        MetricSampleEntity latest = sampleMapper.selectLatestByConfigId(config.getTenantId(), config.getId());
        if (latest == null || latest.getMetadataJson() == null || latest.getCollectedAt() == null) {
            return 0D;
        }
        JsonNode metadata = valueReader.readTree(latest.getMetadataJson());
        if (!metadata.has(metadataField)) {
            return 0D;
        }
        long previousValue = metadata.path(metadataField).asLong(currentValue);
        long elapsedMs = Math.max(1L, now - latest.getCollectedAt().longValue());
        return Math.max(0D, (currentValue - previousValue) * 1000D / elapsedMs);
    }

    private String requiredGroupId(JsonNode parameter) {
        String groupId = firstNotBlank(text(parameter, "groupId"), text(parameter, "consumerGroupId"), text(parameter, "consumerGroup"));
        if (!notBlank(groupId)) {
            throw new IllegalStateException("Kafka consumer groupId is required.");
        }
        return groupId;
    }

    private long firstLong(JsonNode node, String first, String second, String third) {
        if (node.path(first).canConvertToLong()) {
            return node.path(first).asLong();
        }
        if (node.path(second).canConvertToLong()) {
            return node.path(second).asLong();
        }
        return node.path(third).asLong(0L);
    }

    private int firstInt(JsonNode node, String first, String second, String third) {
        if (node.path(first).canConvertToInt()) {
            return node.path(first).asInt();
        }
        if (node.path(second).canConvertToInt()) {
            return node.path(second).asInt();
        }
        return node.path(third).asInt(-1);
    }

    private String encodePath(String value) {
        return value == null ? "" : value.trim().replace(" ", "%20");
    }

    private String normalizeBaseEndpoint(String endpoint) {
        String value = endpoint == null ? "" : endpoint.trim();
        if (value.startsWith("http://") || value.startsWith("https://")) {
            return value;
        }
        return "http://" + value;
    }

    private String normalize(String value) {
        return value == null ? "" : value.trim().toUpperCase(Locale.ROOT).replace('.', '_').replace('-', '_');
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

    private String text(JsonNode node, String fieldName) {
        JsonNode value = node == null ? null : node.path(fieldName);
        return value == null || value.isMissingNode() || value.isNull() ? "" : value.asText("");
    }

    private String escape(String value) {
        return value == null ? "" : value.replace("\\", "\\\\").replace("\"", "\\\"");
    }

    private static final class KafkaLagTarget {
        private final InfrastructureEntity infrastructure;
        private final String topicCode;

        private KafkaLagTarget(InfrastructureEntity infrastructure, String topicCode) {
            this.infrastructure = infrastructure;
            this.topicCode = topicCode;
        }
    }

    private static final class SparkTarget {
        private final InfrastructureEntity infrastructure;
        private final InfrastructureResourceEntity resource;
        private final String applicationName;
        private final String applicationId;

        private SparkTarget(InfrastructureEntity infrastructure, InfrastructureResourceEntity resource,
                            String applicationName, String applicationId) {
            this.infrastructure = infrastructure;
            this.resource = resource;
            this.applicationName = applicationName;
            this.applicationId = applicationId;
        }
    }
}
