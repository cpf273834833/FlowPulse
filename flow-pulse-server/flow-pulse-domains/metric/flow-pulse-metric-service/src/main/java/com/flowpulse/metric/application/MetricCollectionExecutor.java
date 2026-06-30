package com.flowpulse.metric.application;

import com.flowpulse.common.IdGenerator;
import com.flowpulse.metric.application.collection.MetricCollectContext;
import com.flowpulse.metric.application.collection.MetricCollectResult;
import com.flowpulse.metric.application.collection.MetricCollector;
import com.flowpulse.metric.application.collection.MetricCollectorRegistry;
import com.flowpulse.metric.domain.model.MetricCollectRecordEntity;
import com.flowpulse.metric.domain.model.MetricImplementationEntity;
import com.flowpulse.metric.domain.model.MetricSampleEntity;
import com.flowpulse.metric.domain.model.ResourceMetricConfigEntity;
import com.flowpulse.metric.infrastructure.persistence.mapper.MetricCollectRecordMapper;
import com.flowpulse.metric.infrastructure.persistence.mapper.MetricImplementationMapper;
import com.flowpulse.metric.infrastructure.persistence.mapper.MetricSampleMapper;
import com.flowpulse.metric.infrastructure.persistence.mapper.ResourceMetricConfigMapper;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

@Service
public class MetricCollectionExecutor {
    private final ResourceMetricConfigMapper configMapper;
    private final MetricImplementationMapper implementationMapper;
    private final MetricSampleMapper sampleMapper;
    private final MetricCollectRecordMapper recordMapper;
    private final MetricCollectorRegistry collectorRegistry;
    private final ThresholdAlertEvaluator thresholdAlertEvaluator;

    public MetricCollectionExecutor(ResourceMetricConfigMapper configMapper,
                                    MetricImplementationMapper implementationMapper,
                                    MetricSampleMapper sampleMapper,
                                    MetricCollectRecordMapper recordMapper,
                                    MetricCollectorRegistry collectorRegistry,
                                    ThresholdAlertEvaluator thresholdAlertEvaluator) {
        this.configMapper = configMapper;
        this.implementationMapper = implementationMapper;
        this.sampleMapper = sampleMapper;
        this.recordMapper = recordMapper;
        this.collectorRegistry = collectorRegistry;
        this.thresholdAlertEvaluator = thresholdAlertEvaluator;
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public boolean executeDueTask(ResourceMetricConfigEntity task) {
        long now = System.currentTimeMillis();
        int locked = configMapper.markRunning(task.getTenantId(), task.getId(), now);
        if (locked == 0) {
            return false;
        }
        MetricImplementationEntity implementation = implementationMapper.selectById(task.getTenantId(), task.getImplementationId());
        if (implementation == null || !Boolean.TRUE.equals(implementation.getEnabled())) {
            completeFailure(task, now, "Metric implementation is disabled or missing.");
            return true;
        }

        long startedAt = System.currentTimeMillis();
        try {
            MetricCollectContext context = new MetricCollectContext(task, implementation);
            MetricCollector collector = collectorRegistry.require(context);
            MetricCollectResult result = collector.collect(context);
            long finishedAt = System.currentTimeMillis();
            insertSample(task, result, finishedAt);
            thresholdAlertEvaluator.evaluate(task, result.getValue(), finishedAt);
            insertRecord(task, implementation, "SUCCESS", Double.valueOf(result.getValue()), result.getMessage(), startedAt, finishedAt);
            complete(task, "SCHEDULED", "SUCCESS", trim(result.getMessage()), finishedAt);
        } catch (Exception exception) {
            long finishedAt = System.currentTimeMillis();
            String message = readableMessage(exception);
            insertRecord(task, implementation, "ERROR", null, message, startedAt, finishedAt);
            complete(task, "SCHEDULED", "ERROR", message, finishedAt);
        }
        return true;
    }

    private void insertSample(ResourceMetricConfigEntity task, MetricCollectResult result, long collectedAt) {
        MetricSampleEntity sample = new MetricSampleEntity();
        sample.setId(IdGenerator.nextId());
        sample.setTenantId(task.getTenantId());
        sample.setConfigId(task.getId());
        sample.setMetricDefinitionId(task.getMetricDefinitionId());
        sample.setMetricCode(task.getMetricCode());
        sample.setObjectType(task.getObjectType());
        sample.setObjectId(task.getObjectId());
        sample.setObjectCode(task.getObjectCode());
        sample.setValue(Double.valueOf(result.getValue()));
        sample.setCollectedAt(Long.valueOf(collectedAt));
        sample.setMetadataJson(result.getMetadataJson());
        sample.setCreatedAt(Long.valueOf(collectedAt));
        sampleMapper.insert(sample);
    }

    private void insertRecord(ResourceMetricConfigEntity task,
                              MetricImplementationEntity implementation,
                              String status,
                              Double value,
                              String message,
                              long startedAt,
                              long finishedAt) {
        MetricCollectRecordEntity record = new MetricCollectRecordEntity();
        record.setId(IdGenerator.nextId());
        record.setTenantId(task.getTenantId());
        record.setConfigId(task.getId());
        record.setMetricDefinitionId(task.getMetricDefinitionId());
        record.setMetricCode(task.getMetricCode());
        record.setImplementationId(task.getImplementationId());
        record.setImplementationCode(implementation == null ? "" : implementation.getImplementationCode());
        record.setObjectType(task.getObjectType());
        record.setObjectId(task.getObjectId());
        record.setObjectCode(task.getObjectCode());
        record.setExecutionMode(task.getExecutionMode());
        record.setExecutorNodeId(task.getExecutorNodeId());
        record.setStatus(status);
        record.setValue(value);
        record.setMessage(trim(message));
        record.setStartedAt(Long.valueOf(startedAt));
        record.setFinishedAt(Long.valueOf(finishedAt));
        record.setDurationMs(Long.valueOf(Math.max(0L, finishedAt - startedAt)));
        record.setCreatedAt(Long.valueOf(finishedAt));
        recordMapper.insert(record);
    }

    private void completeFailure(ResourceMetricConfigEntity task, long now, String message) {
        insertRecord(task, null, "ERROR", null, message, now, now);
        complete(task, "SCHEDULED", "ERROR", message, now);
    }

    private void complete(ResourceMetricConfigEntity task, String taskStatus, String collectStatus, String message, long now) {
        int interval = task.getIntervalSec() == null ? 60 : Math.max(1, task.getIntervalSec().intValue());
        long nextCollectAt = now + interval * 1000L;
        configMapper.completeCollect(task.getTenantId(), task.getId(), taskStatus, collectStatus, trim(message), now, nextCollectAt, now);
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
        return trim(message == null || message.trim().length() == 0 ? exception.getClass().getSimpleName() : message);
    }

    private String trim(String value) {
        if (value == null) {
            return "";
        }
        String text = value.trim();
        return text.length() <= 1024 ? text : text.substring(0, 1024);
    }
}
