package com.flowpulse.metric.application;

import com.flowpulse.common.IdGenerator;
import com.flowpulse.metric.application.collection.MetricCollectContext;
import com.flowpulse.metric.application.collection.MetricCollectResult;
import com.flowpulse.metric.application.collection.MetricCollector;
import com.flowpulse.metric.application.collection.MetricCollectorRegistry;
import com.flowpulse.metric.application.collection.MetricParameterTemplateResolver;
import com.flowpulse.metric.application.collection.MetricSeriesPoint;
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

import java.util.ArrayList;
import java.util.List;
import java.util.Locale;

@Service
public class MetricCollectionExecutor {
    private static final String TOTAL_INSTANCE = "__TOTAL__";
    private static final String SERIES_AGGREGATE = "AGGREGATE";
    private static final String QUALITY_NORMAL = "NORMAL";

    private final ResourceMetricConfigMapper configMapper;
    private final MetricImplementationMapper implementationMapper;
    private final MetricSampleMapper sampleMapper;
    private final MetricCollectRecordMapper recordMapper;
    private final MetricCollectorRegistry collectorRegistry;
    private final MetricParameterTemplateResolver parameterTemplateResolver;
    private final ThresholdAlertEvaluator thresholdAlertEvaluator;

    public MetricCollectionExecutor(ResourceMetricConfigMapper configMapper,
                                    MetricImplementationMapper implementationMapper,
                                    MetricSampleMapper sampleMapper,
                                    MetricCollectRecordMapper recordMapper,
                                    MetricCollectorRegistry collectorRegistry,
                                    MetricParameterTemplateResolver parameterTemplateResolver,
                                    ThresholdAlertEvaluator thresholdAlertEvaluator) {
        this.configMapper = configMapper;
        this.implementationMapper = implementationMapper;
        this.sampleMapper = sampleMapper;
        this.recordMapper = recordMapper;
        this.collectorRegistry = collectorRegistry;
        this.parameterTemplateResolver = parameterTemplateResolver;
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
            MetricCollectResult result = "DERIVED".equalsIgnoreCase(trim(task.getMetricKind()))
                    ? collectDerived(task, System.currentTimeMillis())
                    : collectOnce(task, implementation, parameterTemplateResolver.resolve(task));
            long finishedAt = System.currentTimeMillis();
            List<MetricSeriesPoint> points = normalizedPoints(task, result);
            insertSamples(task, points, result, finishedAt);
            double primaryValue = primaryValue(points);
            thresholdAlertEvaluator.evaluate(task, primaryValue, finishedAt);
            insertRecord(task, implementation, "SUCCESS", Double.valueOf(primaryValue), result.getMessage(), startedAt, finishedAt);
            complete(task, "SCHEDULED", "SUCCESS", trim(result.getMessage()), finishedAt);
        } catch (Exception exception) {
            long finishedAt = System.currentTimeMillis();
            String message = readableMessage(exception);
            insertRecord(task, implementation, "ERROR", null, message, startedAt, finishedAt);
            complete(task, "SCHEDULED", "ERROR", message, finishedAt);
        }
        return true;
    }

    private MetricCollectResult collectOnce(ResourceMetricConfigEntity task,
                                            MetricImplementationEntity implementation,
                                            String parameterJson) throws Exception {
        MetricCollectContext context = new MetricCollectContext(task, implementation, parameterJson);
        MetricCollector collector = collectorRegistry.require(context);
        return collector.collect(context);
    }

    private MetricCollectResult collectDerived(ResourceMetricConfigEntity task, long collectedAt) {
        String sourceMetricCode = trim(task.getSourceMetricCode());
        String deriveType = trim(task.getDeriveType()).toUpperCase(Locale.ROOT);
        if (sourceMetricCode.length() == 0) {
            throw new IllegalStateException("Derived metric requires source metric code.");
        }
        if (!"DELTA".equals(deriveType) && !"DELTA_PER_SECOND".equals(deriveType)) {
            throw new IllegalStateException("Unsupported derived metric type: " + deriveType);
        }
        List<MetricSampleEntity> latestSamples = sampleMapper.selectLatestSeriesByMetricObject(
                task.getTenantId(), sourceMetricCode, task.getObjectType(), task.getObjectId());
        if (latestSamples == null || latestSamples.isEmpty()) {
            throw new IllegalStateException("No source metric sample found for derived metric.");
        }

        List<MetricSeriesPoint> points = new ArrayList<MetricSeriesPoint>();
        for (MetricSampleEntity current : latestSamples) {
            String instance = defaultText(current.getInstance(), TOTAL_INSTANCE);
            String seriesType = defaultText(current.getSeriesType(), SERIES_AGGREGATE);
            MetricSampleEntity previous = sampleMapper.selectPreviousByMetricObjectSeries(
                    task.getTenantId(), sourceMetricCode, task.getObjectType(), task.getObjectId(),
                    instance, seriesType, current.getCollectedAt());
            if (previous == null || current.getValue() == null || previous.getValue() == null
                    || current.getCollectedAt() == null || previous.getCollectedAt() == null) {
                continue;
            }
            long elapsedMs = current.getCollectedAt().longValue() - previous.getCollectedAt().longValue();
            if (elapsedMs <= 0L) {
                continue;
            }
            double delta = current.getValue().doubleValue() - previous.getValue().doubleValue();
            if (delta < 0D) {
                continue;
            }
            double value = "DELTA_PER_SECOND".equals(deriveType) ? delta * 1000D / elapsedMs : delta;
            points.add(MetricSeriesPoint.of(instance, seriesType, QUALITY_NORMAL, value,
                    "{\"sourceMetricCode\":\"" + jsonEscape(sourceMetricCode) + "\",\"deriveType\":\"" + jsonEscape(deriveType)
                            + "\",\"sourceCollectedAt\":" + current.getCollectedAt() + "}"));
        }
        if (points.isEmpty()) {
            throw new IllegalStateException("No valid source metric baseline found for derived metric.");
        }
        String metadata = "{\"sourceMetricCode\":\"" + jsonEscape(sourceMetricCode) + "\",\"deriveType\":\"" + jsonEscape(deriveType)
                + "\",\"derivedAt\":" + collectedAt + "}";
        return MetricCollectResult.success(points, "Derived metric collected.", metadata);
    }

    private List<MetricSeriesPoint> normalizedPoints(ResourceMetricConfigEntity task, MetricCollectResult result) {
        List<MetricSeriesPoint> points = new ArrayList<MetricSeriesPoint>();
        if (result.getSeriesPoints() != null) {
            points.addAll(result.getSeriesPoints());
        }
        if (points.isEmpty()) {
            points.add(MetricSeriesPoint.aggregate(TOTAL_INSTANCE, result.getValue(), result.getMetadataJson()));
        }
        return points;
    }

    private void insertSamples(ResourceMetricConfigEntity task, List<MetricSeriesPoint> points, MetricCollectResult result, long collectedAt) {
        for (MetricSeriesPoint point : points) {
            insertSample(task, point, result, collectedAt);
        }
    }

    private void insertSample(ResourceMetricConfigEntity task, MetricSeriesPoint point, MetricCollectResult result, long collectedAt) {
        MetricSampleEntity sample = new MetricSampleEntity();
        sample.setId(IdGenerator.nextId());
        sample.setTenantId(task.getTenantId());
        sample.setConfigId(task.getId());
        sample.setMetricDefinitionId(task.getMetricDefinitionId());
        sample.setMetricCode(task.getMetricCode());
        sample.setObjectType(task.getObjectType());
        sample.setObjectId(task.getObjectId());
        sample.setObjectCode(task.getObjectCode());
        sample.setInfrastructureType(infrastructureType(task));
        sample.setInfrastructureId(infrastructureId(task));
        sample.setInstance(defaultText(point.getInstance(), TOTAL_INSTANCE));
        sample.setSeriesType(defaultText(point.getSeriesType(), SERIES_AGGREGATE));
        sample.setQuality(defaultText(point.getQuality(), QUALITY_NORMAL));
        sample.setValue(Double.valueOf(point.getValue()));
        sample.setCollectedAt(Long.valueOf(collectedAt));
        sample.setMetadataJson(trim(point.getMetadataJson()).length() == 0 ? result.getMetadataJson() : point.getMetadataJson());
        sample.setCreatedAt(Long.valueOf(collectedAt));
        sampleMapper.insert(sample);
        if (TOTAL_INSTANCE.equals(sample.getInstance()) && SERIES_AGGREGATE.equals(sample.getSeriesType())) {
            configMapper.updateCurrentValue(task.getTenantId(), task.getId(), sample.getValue().doubleValue(), collectedAt);
        }
    }

    private double primaryValue(List<MetricSeriesPoint> points) {
        for (MetricSeriesPoint point : points) {
            if (TOTAL_INSTANCE.equals(point.getInstance()) && SERIES_AGGREGATE.equals(point.getSeriesType())) {
                return point.getValue();
            }
        }
        return points.get(0).getValue();
    }

    private String infrastructureType(ResourceMetricConfigEntity task) {
        String objectType = trim(task.getObjectType());
        if ("INFRASTRUCTURE".equalsIgnoreCase(objectType)) {
            return trim(task.getObjectCode()).length() == 0 ? objectType : trim(task.getObjectCode());
        }
        return objectType;
    }

    private String infrastructureId(ResourceMetricConfigEntity task) {
        return "INFRASTRUCTURE".equalsIgnoreCase(trim(task.getObjectType())) ? task.getObjectId() : "";
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

    private String jsonEscape(String value) {
        if (value == null) {
            return "";
        }
        return value.replace("\\", "\\\\").replace("\"", "\\\"");
    }

    private String defaultText(String value, String defaultValue) {
        String text = trim(value);
        return text.length() == 0 ? defaultValue : text;
    }

    private String trim(String value) {
        if (value == null) {
            return "";
        }
        String text = value.trim();
        return text.length() <= 1024 ? text : text.substring(0, 1024);
    }
}
