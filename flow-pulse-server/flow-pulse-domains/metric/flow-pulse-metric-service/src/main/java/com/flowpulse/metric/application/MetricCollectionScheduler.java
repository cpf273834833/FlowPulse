package com.flowpulse.metric.application;

import com.flowpulse.metric.domain.model.ResourceMetricConfigEntity;
import com.flowpulse.metric.infrastructure.persistence.mapper.ResourceMetricConfigMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

@Component
public class MetricCollectionScheduler {
    private static final Logger LOGGER = LoggerFactory.getLogger(MetricCollectionScheduler.class);

    private final ResourceMetricConfigMapper configMapper;
    private final MetricCollectionExecutor collectionExecutor;
    private final MetricCatalogLifecycle catalogLifecycle;
    private final ExecutorService workerPool;
    private final Set<String> inFlightTaskIds = ConcurrentHashMap.newKeySet();
    private final int batchSize;

    public MetricCollectionScheduler(ResourceMetricConfigMapper configMapper,
                                     MetricCollectionExecutor collectionExecutor,
                                     MetricCatalogLifecycle catalogLifecycle,
                                     @Value("${flowpulse.metric.collection.worker-size:4}") int workerSize,
                                     @Value("${flowpulse.metric.collection.batch-size:50}") int batchSize) {
        this.configMapper = configMapper;
        this.collectionExecutor = collectionExecutor;
        this.catalogLifecycle = catalogLifecycle;
        this.workerPool = Executors.newFixedThreadPool(Math.max(1, workerSize));
        this.batchSize = Math.max(1, batchSize);
    }

    @Scheduled(fixedDelayString = "${flowpulse.metric.collection.scan-delay-ms:5000}")
    public void scanDueTasks() {
        if (!catalogLifecycle.isReady()) {
            return;
        }
        long now = System.currentTimeMillis();
        List<ResourceMetricConfigEntity> tasks = configMapper.selectDueTasks(now, batchSize);
        for (final ResourceMetricConfigEntity task : tasks) {
            if (!inFlightTaskIds.add(task.getId())) {
                continue;
            }
            workerPool.submit(new Runnable() {
                @Override
                public void run() {
                    try {
                        collectionExecutor.executeDueTask(task);
                    } catch (Exception exception) {
                        LOGGER.warn("Metric collection task execution failed. configId={}", task.getId(), exception);
                    } finally {
                        inFlightTaskIds.remove(task.getId());
                    }
                }
            });
        }
    }
}
