package com.flowpulse.metric.application.collection;

import com.flowpulse.metric.domain.model.MetricImplementationEntity;
import com.flowpulse.metric.domain.model.ResourceMetricConfigEntity;
import org.junit.jupiter.api.Test;
import static org.assertj.core.api.Assertions.assertThat;

class TechnologyMetricCollectorRoutingTest {
    @Test void eachTechnologyOnlyAcceptsItsOwnPrefix() {
        KafkaMetricCollector kafka = new KafkaMetricCollector(null, null, null, null, null, null);
        SparkMetricCollector spark = new SparkMetricCollector(null, null, null, null, null, null);
        ElasticsearchMetricCollector elasticsearch = new ElasticsearchMetricCollector(null, null, null, null, null, null);

        assertThat(kafka.supports(context("KAFKA_GROUP_LAG_TOTAL"))).isTrue();
        assertThat(kafka.supports(context("SPARK_EXECUTOR_COUNT"))).isFalse();
        assertThat(spark.supports(context("SPARK_EXECUTOR_COUNT"))).isTrue();
        assertThat(elasticsearch.supports(context("ES_CLUSTER_HEALTH_STATUS"))).isTrue();
    }

    private MetricCollectContext context(String collector) {
        MetricImplementationEntity implementation = new MetricImplementationEntity();
        implementation.setImplementationType("BUILT_IN");
        implementation.setBuiltInCollector(collector);
        return new MetricCollectContext(new ResourceMetricConfigEntity(), implementation, "{}");
    }
}
