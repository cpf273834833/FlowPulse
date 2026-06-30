package com.flowpulse.alert.application;

import com.flowpulse.alert.api.request.AlertStateQueryRequest;
import com.flowpulse.alert.api.response.AlertDetailResponse;
import com.flowpulse.alert.api.response.AlertEventResponse;
import com.flowpulse.alert.api.response.AlertStatePageResponse;
import com.flowpulse.alert.api.response.AlertStateResponse;
import com.flowpulse.alert.api.response.PageResponse;
import com.flowpulse.alert.domain.model.AlertEventEntity;
import com.flowpulse.alert.domain.model.AlertStateEntity;
import com.flowpulse.alert.infrastructure.persistence.mapper.AlertEventMapper;
import com.flowpulse.alert.infrastructure.persistence.mapper.AlertStateMapper;
import com.flowpulse.common.BusinessException;
import com.flowpulse.common.ErrorCode;
import com.flowpulse.common.StatCard;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;
import java.util.Locale;

@Service
public class AlertCenterService {
    private final AlertStateMapper alertStateMapper;
    private final AlertEventMapper alertEventMapper;

    public AlertCenterService(AlertStateMapper alertStateMapper, AlertEventMapper alertEventMapper) {
        this.alertStateMapper = alertStateMapper;
        this.alertEventMapper = alertEventMapper;
    }

    public AlertStatePageResponse page(String tenantId, AlertStateQueryRequest request) {
        AlertStateQueryRequest query = request == null ? new AlertStateQueryRequest() : request;
        int pageNo = positive(query.getPageNo(), 1);
        int pageSize = bounded(query.getPageSize(), 10, 100);
        List<AlertStateEntity> rows = alertStateMapper.selectPage(tenantId, trim(query.getKeyword()), upper(query.getLevel()),
                upper(query.getStatus()), upper(query.getObjectType()), trim(query.getTopologyId()),
                trim(query.getTopologyElementId()), (pageNo - 1) * pageSize, pageSize);
        long total = alertStateMapper.countPage(tenantId, trim(query.getKeyword()), upper(query.getLevel()),
                upper(query.getStatus()), upper(query.getObjectType()), trim(query.getTopologyId()),
                trim(query.getTopologyElementId()));

        PageResponse<AlertStateResponse> page = new PageResponse<AlertStateResponse>();
        page.setRecords(toStateResponses(rows));
        page.setTotal(total);
        page.setPageNo(pageNo);
        page.setPageSize(pageSize);

        AlertStatePageResponse response = new AlertStatePageResponse();
        response.setAlerts(page);
        response.setStats(buildStats(tenantId));
        return response;
    }

    public AlertDetailResponse detail(String tenantId, String id) {
        AlertStateEntity state = require(tenantId, id);
        AlertDetailResponse response = new AlertDetailResponse();
        response.setAlert(toStateResponse(state));
        response.setEvents(toEventResponses(alertEventMapper.selectByAlertStateId(tenantId, id)));
        return response;
    }

    @Transactional
    public AlertStateResponse acknowledge(String tenantId, String id, String operator) {
        require(tenantId, id);
        alertStateMapper.acknowledge(tenantId, id, defaultText(operator, "system"), System.currentTimeMillis());
        return toStateResponse(require(tenantId, id));
    }

    private AlertStateEntity require(String tenantId, String id) {
        AlertStateEntity entity = alertStateMapper.selectById(tenantId, id);
        if (entity == null) {
            throw new BusinessException(ErrorCode.RESOURCE_NOT_FOUND, "alert.state.not.found");
        }
        return entity;
    }

    private List<AlertStateResponse> toStateResponses(List<AlertStateEntity> rows) {
        List<AlertStateResponse> responses = new ArrayList<AlertStateResponse>();
        for (AlertStateEntity row : rows) {
            responses.add(toStateResponse(row));
        }
        return responses;
    }

    private AlertStateResponse toStateResponse(AlertStateEntity entity) {
        AlertStateResponse response = new AlertStateResponse();
        response.setId(entity.getId());
        response.setAlertKey(entity.getAlertKey());
        response.setRuleId(entity.getRuleId());
        response.setMetricDefinitionId(entity.getMetricDefinitionId());
        response.setObjectType(entity.getObjectType());
        response.setObjectId(entity.getObjectId());
        response.setObjectCode(entity.getObjectCode());
        response.setObjectName(entity.getObjectName());
        response.setTopologyId(entity.getTopologyId());
        response.setTopologyElementId(entity.getTopologyElementId());
        response.setTopologyElementType(entity.getTopologyElementType());
        response.setCurrentLevel(entity.getCurrentLevel());
        response.setPreviousLevel(entity.getPreviousLevel());
        response.setStatus(entity.getStatus());
        response.setFirstTriggeredAt(entity.getFirstTriggeredAt());
        response.setLastChangedAt(entity.getLastChangedAt());
        response.setLastEvaluatedAt(entity.getLastEvaluatedAt());
        response.setRecoveredAt(entity.getRecoveredAt());
        response.setTriggerValue(entity.getTriggerValue());
        response.setMessage(entity.getMessage());
        response.setReasonJson(entity.getReasonJson());
        response.setAcknowledged(entity.getAcknowledged());
        response.setAcknowledgedBy(entity.getAcknowledgedBy());
        response.setAcknowledgedAt(entity.getAcknowledgedAt());
        response.setCreatedAt(entity.getCreatedAt());
        response.setUpdatedAt(entity.getUpdatedAt());
        return response;
    }

    private List<AlertEventResponse> toEventResponses(List<AlertEventEntity> rows) {
        List<AlertEventResponse> responses = new ArrayList<AlertEventResponse>();
        for (AlertEventEntity row : rows) {
            AlertEventResponse response = new AlertEventResponse();
            response.setId(row.getId());
            response.setAlertStateId(row.getAlertStateId());
            response.setAlertKey(row.getAlertKey());
            response.setFromLevel(row.getFromLevel());
            response.setToLevel(row.getToLevel());
            response.setEventType(row.getEventType());
            response.setEventAt(row.getEventAt());
            response.setTriggerValue(row.getTriggerValue());
            response.setMessage(row.getMessage());
            response.setReasonJson(row.getReasonJson());
            responses.add(response);
        }
        return responses;
    }

    private List<StatCard> buildStats(String tenantId) {
        List<StatCard> stats = new ArrayList<StatCard>();
        stats.add(new StatCard("当前告警", String.valueOf(alertStateMapper.countAll(tenantId)), "当前可追踪的告警状态"));
        stats.add(new StatCard("未恢复", String.valueOf(alertStateMapper.countByStatus(tenantId, "ACTIVE")), "仍在影响对象状态"));
        stats.add(new StatCard("紧急", String.valueOf(alertStateMapper.countByLevel(tenantId, "CRITICAL")), "需要立即处理"));
        stats.add(new StatCard("错误", String.valueOf(alertStateMapper.countByLevel(tenantId, "ERROR")), "已经触发错误级别"));
        return stats;
    }

    private int positive(Integer value, int defaultValue) {
        return value == null || value.intValue() <= 0 ? defaultValue : value.intValue();
    }

    private int bounded(Integer value, int defaultValue, int max) {
        return Math.min(positive(value, defaultValue), max);
    }

    private String defaultText(String value, String defaultValue) {
        String text = trim(value);
        return text.length() == 0 ? defaultValue : text;
    }

    private String upper(String value) {
        return trim(value).toUpperCase(Locale.ROOT);
    }

    private String trim(String value) {
        return value == null ? "" : value.trim();
    }
}
