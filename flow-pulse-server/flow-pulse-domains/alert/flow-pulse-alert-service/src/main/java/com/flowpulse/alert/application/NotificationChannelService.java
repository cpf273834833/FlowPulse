package com.flowpulse.alert.application;

import com.flowpulse.alert.api.request.NotificationChannelSaveRequest;
import com.flowpulse.alert.api.response.NotificationChannelResponse;
import com.flowpulse.alert.domain.model.NotificationChannelEntity;
import com.flowpulse.alert.infrastructure.persistence.mapper.NotificationChannelMapper;
import com.flowpulse.common.BusinessException;
import com.flowpulse.common.ErrorCode;
import com.flowpulse.common.IdGenerator;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;

@Service
public class NotificationChannelService {
    private final NotificationChannelMapper notificationChannelMapper;

    public NotificationChannelService(NotificationChannelMapper notificationChannelMapper) {
        this.notificationChannelMapper = notificationChannelMapper;
    }

    public List<NotificationChannelResponse> list(String tenantId) {
        List<NotificationChannelResponse> responses = new ArrayList<NotificationChannelResponse>();
        for (NotificationChannelEntity entity : notificationChannelMapper.selectAll(tenantId)) {
            responses.add(toResponse(entity));
        }
        return responses;
    }

    public NotificationChannelResponse detail(String tenantId, String id) {
        return toResponse(require(tenantId, id));
    }

    @Transactional
    public NotificationChannelResponse create(String tenantId, NotificationChannelSaveRequest request) {
        assertUnique(tenantId, null, request.getChannelCode());
        long now = System.currentTimeMillis();
        NotificationChannelEntity entity = new NotificationChannelEntity();
        entity.setId(IdGenerator.nextId());
        entity.setTenantId(tenantId);
        fill(entity, request);
        entity.setCreatedAt(Long.valueOf(now));
        entity.setUpdatedAt(Long.valueOf(now));
        notificationChannelMapper.insert(entity);
        return detail(tenantId, entity.getId());
    }

    @Transactional
    public NotificationChannelResponse update(String tenantId, String id, NotificationChannelSaveRequest request) {
        NotificationChannelEntity entity = require(tenantId, id);
        assertUnique(tenantId, id, request.getChannelCode());
        fill(entity, request);
        entity.setUpdatedAt(Long.valueOf(System.currentTimeMillis()));
        notificationChannelMapper.update(entity);
        return detail(tenantId, id);
    }

    @Transactional
    public void delete(String tenantId, String id) {
        require(tenantId, id);
        notificationChannelMapper.deleteById(tenantId, id);
    }

    private void fill(NotificationChannelEntity entity, NotificationChannelSaveRequest request) {
        entity.setChannelCode(trim(request.getChannelCode()));
        entity.setChannelName(trim(request.getChannelName()));
        entity.setChannelType(defaultText(request.getChannelType(), "THIRD_PARTY"));
        entity.setEndpoint(trim(request.getEndpoint()));
        entity.setApiKey(trim(request.getApiKey()));
        entity.setEnabled(request.getEnabled() == null ? Boolean.TRUE : request.getEnabled());
        entity.setDescription(trim(request.getDescription()));
    }

    private NotificationChannelEntity require(String tenantId, String id) {
        NotificationChannelEntity entity = notificationChannelMapper.selectById(tenantId, id);
        if (entity == null) {
            throw new BusinessException(ErrorCode.RESOURCE_NOT_FOUND, "notification.channel.not.found");
        }
        return entity;
    }

    private void assertUnique(String tenantId, String currentId, String code) {
        NotificationChannelEntity entity = notificationChannelMapper.selectByCode(tenantId, trim(code));
        if (entity != null && !entity.getId().equals(currentId)) {
            throw new BusinessException(ErrorCode.CONFLICT, "notification.channel.code.exists");
        }
    }

    private NotificationChannelResponse toResponse(NotificationChannelEntity entity) {
        NotificationChannelResponse response = new NotificationChannelResponse();
        response.setId(entity.getId());
        response.setChannelCode(entity.getChannelCode());
        response.setChannelName(entity.getChannelName());
        response.setChannelType(entity.getChannelType());
        response.setEndpoint(entity.getEndpoint());
        response.setApiKey(entity.getApiKey());
        response.setEnabled(entity.getEnabled());
        response.setDescription(entity.getDescription());
        response.setCreatedAt(entity.getCreatedAt());
        response.setUpdatedAt(entity.getUpdatedAt());
        return response;
    }

    private String defaultText(String value, String defaultValue) {
        String text = trim(value);
        return text.length() == 0 ? defaultValue : text;
    }

    private String trim(String value) {
        return value == null ? "" : value.trim();
    }
}
