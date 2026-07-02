package com.flowpulse.metric.application;

import com.flowpulse.common.TenantContext;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;

@Component
public class MetricBuiltinCatalogInitializer {
    private static final String MIGRATION_KEY = "metric_builtin_java_catalog_v1";
    private static final String OUTPUT_SCHEMA = "{\"value\":\"number\",\"timestamp\":\"number\",\"message\":\"string\"}";

    private final JdbcTemplate jdbcTemplate;
    private final MetricCatalogLifecycle catalogLifecycle;

    public MetricBuiltinCatalogInitializer(JdbcTemplate jdbcTemplate, MetricCatalogLifecycle catalogLifecycle) {
        this.jdbcTemplate = jdbcTemplate;
        this.catalogLifecycle = catalogLifecycle;
    }

    @EventListener(ApplicationReadyEvent.class)
    @Transactional
    public void initialize() {
        if (!migrationApplied()) {
            resetMetricCatalog();
            jdbcTemplate.update("insert into fp_system_migration(migration_key, applied_at) values(?, ?)",
                    MIGRATION_KEY, Long.valueOf(System.currentTimeMillis()));
        }
        for (String tenantId : tenantIds()) {
            upsertCatalog(tenantId);
        }
        catalogLifecycle.markReady();
    }

    private boolean migrationApplied() {
        Integer count = jdbcTemplate.queryForObject(
                "select count(1) from fp_system_migration where migration_key = ?", Integer.class, MIGRATION_KEY);
        return count != null && count.intValue() > 0;
    }

    private void resetMetricCatalog() {
        jdbcTemplate.update("delete from fp_notification_record");
        jdbcTemplate.update("delete from fp_alert_event");
        jdbcTemplate.update("delete from fp_alert_state");
        jdbcTemplate.update("delete from fp_threshold_rule");
        jdbcTemplate.update("delete from fp_metric_collect_record");
        jdbcTemplate.update("delete from fp_metric_sample");
        jdbcTemplate.update("delete from fp_resource_metric_config");
        jdbcTemplate.update("delete from fp_metric_applicability");
        jdbcTemplate.update("delete from fp_metric_implementation");
        jdbcTemplate.update("delete from fp_metric_definition");
    }

    private Set<String> tenantIds() {
        Set<String> tenants = new LinkedHashSet<String>();
        tenants.add(TenantContext.DEFAULT_TENANT_ID);
        tenants.addAll(jdbcTemplate.queryForList("select distinct tenant_id from fp_environment", String.class));
        tenants.addAll(jdbcTemplate.queryForList("select distinct tenant_id from fp_infrastructure", String.class));
        tenants.addAll(jdbcTemplate.queryForList("select distinct tenant_id from fp_region", String.class));
        return tenants;
    }

    private void upsertCatalog(String tenantId) {
        long now = System.currentTimeMillis();
        for (BuiltinMetric metric : metrics()) {
            String metricId = id("metric:" + tenantId + ":" + metric.code);
            upsertMetricDefinition(tenantId, metricId, metric, now);
            upsertMetricImplementation(tenantId, metricId, metric, now);
            jdbcTemplate.update("delete from fp_metric_applicability where tenant_id = ? and metric_definition_id = ?",
                    tenantId, metricId);
            int index = 0;
            for (Applicability applicability : metric.applicability) {
                upsertApplicability(tenantId, metricId, metric.code, applicability, index++, now);
            }
        }
    }

    private void upsertMetricDefinition(String tenantId, String id, BuiltinMetric metric, long now) {
        Integer count = jdbcTemplate.queryForObject(
                "select count(1) from fp_metric_definition where tenant_id = ? and metric_code = ?",
                Integer.class, tenantId, metric.code);
        if (count != null && count.intValue() > 0) {
            jdbcTemplate.update("update fp_metric_definition set id = ?, metric_name = ?, metric_category = ?, object_type = ?, "
                            + "value_unit = ?, value_precision = ?, metric_kind = ?, instance_dimension = ?, source_metric_code = ?, "
                            + "derive_type = ?, parameter_schema_json = ?, mapping_json = ?, system_builtin = true, enabled = true, "
                            + "description = ?, updated_at = ? where tenant_id = ? and metric_code = ?",
                    id, metric.name, metric.category, metric.objectType, metric.unit, Integer.valueOf(metric.precision),
                    metric.kind, metric.instanceDimension, metric.sourceMetricCode, metric.deriveType,
                    metric.parameterSchema, metric.mappingJson, metric.description, Long.valueOf(now), tenantId, metric.code);
        } else {
            jdbcTemplate.update("insert into fp_metric_definition(id, tenant_id, metric_code, metric_name, metric_category, object_type, "
                            + "value_unit, value_precision, metric_kind, instance_dimension, source_metric_code, derive_type, "
                            + "parameter_schema_json, mapping_json, system_builtin, enabled, description, created_at, updated_at) "
                            + "values(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, true, true, ?, ?, ?)",
                    id, tenantId, metric.code, metric.name, metric.category, metric.objectType, metric.unit,
                    Integer.valueOf(metric.precision), metric.kind, metric.instanceDimension, metric.sourceMetricCode,
                    metric.deriveType, metric.parameterSchema, metric.mappingJson, metric.description,
                    Long.valueOf(now), Long.valueOf(now));
        }
    }

    private void upsertMetricImplementation(String tenantId, String metricId, BuiltinMetric metric, long now) {
        String implementationCode = metric.code + ".java";
        String implementationId = id("implementation:" + tenantId + ":" + implementationCode);
        Integer count = jdbcTemplate.queryForObject(
                "select count(1) from fp_metric_implementation where tenant_id = ? and implementation_code = ?",
                Integer.class, tenantId, implementationCode);
        if (count != null && count.intValue() > 0) {
            jdbcTemplate.update("update fp_metric_implementation set id = ?, metric_definition_id = ?, implementation_name = ?, "
                            + "implementation_type = 'BUILT_IN', execution_mode = 'SERVER', script_language = '', script_content = '', "
                            + "parameter_schema_json = ?, output_schema_json = ?, built_in_collector = ?, default_implementation = true, "
                            + "system_builtin = true, enabled = true, timeout_sec = 30, description = ?, updated_at = ? "
                            + "where tenant_id = ? and implementation_code = ?",
                    implementationId, metricId, metric.name + " Java 内置采集", metric.parameterSchema, OUTPUT_SCHEMA,
                    metric.collector, metric.description, Long.valueOf(now), tenantId, implementationCode);
        } else {
            jdbcTemplate.update("insert into fp_metric_implementation(id, tenant_id, metric_definition_id, implementation_code, "
                            + "implementation_name, implementation_type, execution_mode, script_language, script_content, "
                            + "parameter_schema_json, output_schema_json, built_in_collector, default_implementation, system_builtin, "
                            + "enabled, timeout_sec, description, created_at, updated_at) "
                            + "values(?, ?, ?, ?, ?, 'BUILT_IN', 'SERVER', '', '', ?, ?, ?, true, true, true, 30, ?, ?, ?)",
                    implementationId, tenantId, metricId, implementationCode, metric.name + " Java 内置采集",
                    metric.parameterSchema, OUTPUT_SCHEMA, metric.collector, metric.description,
                    Long.valueOf(now), Long.valueOf(now));
        }
    }

    private void upsertApplicability(String tenantId, String metricId, String metricCode, Applicability applicability, int index, long now) {
        jdbcTemplate.update("insert into fp_metric_applicability(id, tenant_id, metric_definition_id, scope_type, object_type, relation_type, "
                        + "source_object_type, target_object_type, collect_anchor, required_params_json, enabled, description, created_at, updated_at) "
                        + "values(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, true, ?, ?, ?)",
                id("applicability:" + tenantId + ":" + metricCode + ":" + index),
                tenantId, metricId, applicability.scopeType, applicability.objectType, applicability.relationType,
                applicability.sourceObjectType, applicability.targetObjectType, applicability.collectAnchor,
                applicability.requiredParamsJson, applicability.description, Long.valueOf(now), Long.valueOf(now));
    }

    private List<BuiltinMetric> metrics() {
        List<BuiltinMetric> metrics = new ArrayList<BuiltinMetric>();
        metrics.add(new BuiltinMetric("kafka.topic.message.rate", "Kafka Topic 消息入速率", "INFRASTRUCTURE", "KAFKA_TOPIC", "msg/s", 2,
                "RAW", "", "", "topic", topicParameterSchema(), "", "统计 Topic 最新 offset 与上一次采集 offset 的差值速率。",
                "KAFKA_TOPIC_MESSAGE_RATE", rules(resource("KAFKA_TOPIC", "CURRENT_OBJECT"))));
        metrics.add(new BuiltinMetric("kafka.group.lag.total", "Kafka Group Lag 总量", "INFRASTRUCTURE", "TOPOLOGY_EDGE", "条", 0,
                "RAW", "", "", "groupId", kafkaGroupParameterSchema(), "", "统计指定 Topic 和消费组的总积压。",
                "KAFKA_GROUP_LAG_TOTAL", rules(kafkaConsumeEdge())));
        metrics.add(new BuiltinMetric("kafka.group.active.members", "Kafka Group 活跃 Member 数", "INFRASTRUCTURE", "TOPOLOGY_EDGE", "个", 0,
                "RAW", "", "", "groupId", kafkaGroupParameterSchema(), "", "统计消费组当前活跃消费者数量。",
                "KAFKA_GROUP_ACTIVE_MEMBERS", rules(kafkaConsumeEdge())));
        metrics.add(new BuiltinMetric("kafka.group.last.commit.time", "Kafka Group 最后提交时间", "INFRASTRUCTURE", "TOPOLOGY_EDGE", "ms", 0,
                "RAW", "", "", "groupId", kafkaGroupParameterSchema(), "", "返回 FlowPulse 最近一次观测到该消费组 offset 存在的时间戳。",
                "KAFKA_GROUP_LAST_COMMIT_TIME", rules(kafkaConsumeEdge())));
        metrics.add(new BuiltinMetric("spark.application.status", "Spark 应用运行状态", "INFRASTRUCTURE", "SPARK_APPLICATION", "", 0,
                "RAW", "", "", "application", emptyParameterSchema(), "{\"0\":\"未运行\",\"1\":\"运行中\"}", "判断 Spark 应用是否处于 RUNNING。",
                "SPARK_APPLICATION_STATUS", rules(resource("SPARK_APPLICATION", "CURRENT_OBJECT"), resource("SPARK_LOGICAL_JOB", "CURRENT_OBJECT"))));
        metrics.add(new BuiltinMetric("spark.application.start.time", "Spark 应用启动时间", "INFRASTRUCTURE", "SPARK_APPLICATION", "ms", 0,
                "RAW", "", "", "application", emptyParameterSchema(), "", "采集 Spark 应用启动时间毫秒时间戳。",
                "SPARK_APPLICATION_START_TIME", rules(resource("SPARK_APPLICATION", "CURRENT_OBJECT"), resource("SPARK_LOGICAL_JOB", "CURRENT_OBJECT"))));
        metrics.add(new BuiltinMetric("spark.executor.count", "Spark Executor 数", "INFRASTRUCTURE", "SPARK_APPLICATION", "个", 0,
                "RAW", "", "", "application", emptyParameterSchema(), "", "采集 Spark 应用当前 Executor 数量。",
                "SPARK_EXECUTOR_COUNT", rules(resource("SPARK_APPLICATION", "CURRENT_OBJECT"), resource("SPARK_LOGICAL_JOB", "CURRENT_OBJECT"))));
        metrics.add(new BuiltinMetric("spark.backlog.queue.count", "Spark 积压队列数", "INFRASTRUCTURE", "SPARK", "个", 0,
                "RAW", "", "", "queue", emptyParameterSchema(), "", "采集 Spark Master 等待调度应用数量。",
                "SPARK_BACKLOG_QUEUE_COUNT", rules(infrastructure("SPARK", "CURRENT_OBJECT"))));
        metrics.add(new BuiltinMetric("es.index.doc.growth.rate", "ES 索引文档增长速率", "INFRASTRUCTURE", "ES_INDEX", "doc/s", 2,
                "RAW", "", "", "index", esIndexParameterSchema(), "", "统计索引文档数与上一次采集文档数的差值速率。",
                "ES_INDEX_DOC_GROWTH_RATE", rules(resource("ES_INDEX", "CURRENT_OBJECT"), resource("ES_LOGICAL_INDEX", "CURRENT_OBJECT"))));
        metrics.add(new BuiltinMetric("es.cluster.health.status", "ES 集群健康状态", "INFRASTRUCTURE", "ELASTICSEARCH", "", 0,
                "RAW", "", "", "cluster", emptyParameterSchema(), "{\"0\":\"green\",\"1\":\"yellow\",\"2\":\"red\",\"3\":\"unknown\"}", "采集 Elasticsearch 集群健康状态。",
                "ES_CLUSTER_HEALTH_STATUS", rules(infrastructure("ELASTICSEARCH", "CURRENT_OBJECT"))));
        return metrics;
    }

    private Applicability resource(String objectType, String collectAnchor) {
        return new Applicability("RESOURCE", objectType, "", "", "", collectAnchor, "{}", "资源对象指标");
    }

    private Applicability infrastructure(String objectType, String collectAnchor) {
        return new Applicability("INFRASTRUCTURE", objectType, "", "", "", collectAnchor, "{}", "基础设施实例指标");
    }

    private Applicability kafkaConsumeEdge() {
        return new Applicability("TOPOLOGY_EDGE", "TOPOLOGY_EDGE", "", "KAFKA_TOPIC", "",
                "SOURCE_OBJECT", "{\"topic\":\"源节点 Kafka Topic\",\"groupId\":\"消费组 ID\"}", "Kafka 消费连线指标");
    }

    private List<Applicability> rules(Applicability... rules) {
        return Arrays.asList(rules);
    }

    private String emptyParameterSchema() {
        return "{}";
    }

    private String topicParameterSchema() {
        return "{\"topic\":{\"label\":\"Topic\",\"required\":true,\"dataType\":\"STRING\",\"defaultValue\":\"{sourceCode}\",\"helpText\":\"Kafka Topic 名称\"}}";
    }

    private String kafkaGroupParameterSchema() {
        return "{\"topic\":{\"label\":\"Topic\",\"required\":true,\"dataType\":\"STRING\",\"defaultValue\":\"{sourceCode}\",\"helpText\":\"Kafka Topic 名称\"},"
                + "\"groupId\":{\"label\":\"消费组\",\"required\":true,\"dataType\":\"STRING\",\"defaultValue\":\"\",\"helpText\":\"Kafka Consumer Group ID\"}}";
    }

    private String esIndexParameterSchema() {
        return "{\"index\":{\"label\":\"索引\",\"required\":true,\"dataType\":\"STRING\",\"defaultValue\":\"{sourceCode}\",\"helpText\":\"Elasticsearch 索引名称\"}}";
    }

    private String id(String value) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] bytes = digest.digest(value.getBytes(StandardCharsets.UTF_8));
            StringBuilder builder = new StringBuilder();
            for (int i = 0; i < bytes.length && builder.length() < 32; i++) {
                builder.append(String.format("%02x", Integer.valueOf(bytes[i] & 0xff)));
            }
            return builder.substring(0, 32);
        } catch (Exception exception) {
            throw new IllegalStateException("Unable to create deterministic id.", exception);
        }
    }

    private static final class BuiltinMetric {
        private final String code;
        private final String name;
        private final String category;
        private final String objectType;
        private final String unit;
        private final int precision;
        private final String kind;
        private final String sourceMetricCode;
        private final String deriveType;
        private final String instanceDimension;
        private final String parameterSchema;
        private final String mappingJson;
        private final String description;
        private final String collector;
        private final List<Applicability> applicability;

        private BuiltinMetric(String code, String name, String category, String objectType, String unit, int precision,
                              String kind, String sourceMetricCode, String deriveType, String instanceDimension,
                              String parameterSchema, String mappingJson, String description, String collector,
                              List<Applicability> applicability) {
            this.code = code;
            this.name = name;
            this.category = category;
            this.objectType = objectType;
            this.unit = unit;
            this.precision = precision;
            this.kind = kind;
            this.sourceMetricCode = sourceMetricCode;
            this.deriveType = deriveType;
            this.instanceDimension = instanceDimension;
            this.parameterSchema = parameterSchema;
            this.mappingJson = mappingJson;
            this.description = description;
            this.collector = collector;
            this.applicability = applicability;
        }
    }

    private static final class Applicability {
        private final String scopeType;
        private final String objectType;
        private final String relationType;
        private final String sourceObjectType;
        private final String targetObjectType;
        private final String collectAnchor;
        private final String requiredParamsJson;
        private final String description;

        private Applicability(String scopeType, String objectType, String relationType, String sourceObjectType,
                              String targetObjectType, String collectAnchor, String requiredParamsJson, String description) {
            this.scopeType = scopeType;
            this.objectType = objectType;
            this.relationType = relationType;
            this.sourceObjectType = sourceObjectType;
            this.targetObjectType = targetObjectType;
            this.collectAnchor = collectAnchor;
            this.requiredParamsJson = requiredParamsJson;
            this.description = description;
        }
    }
}
