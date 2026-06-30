package com.flowpulse.web.controller;

import com.flowpulse.alert.api.request.NotificationChannelSaveRequest;
import com.flowpulse.alert.api.response.NotificationChannelResponse;
import com.flowpulse.alert.application.NotificationChannelService;
import com.flowpulse.common.ApiResponse;
import com.flowpulse.web.support.TenantIdResolver;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import javax.servlet.http.HttpServletRequest;
import javax.validation.Valid;
import java.util.List;

@Validated
@RestController
@RequestMapping("/frontapi/v1/notification-channels")
public class NotificationChannelController {
    private final NotificationChannelService notificationChannelService;
    private final TenantIdResolver tenantIdResolver;

    public NotificationChannelController(NotificationChannelService notificationChannelService, TenantIdResolver tenantIdResolver) {
        this.notificationChannelService = notificationChannelService;
        this.tenantIdResolver = tenantIdResolver;
    }

    @GetMapping
    public ApiResponse<List<NotificationChannelResponse>> list(HttpServletRequest request) {
        return ApiResponse.success(notificationChannelService.list(tenantIdResolver.resolve(request)));
    }

    @GetMapping("/{id}")
    public ApiResponse<NotificationChannelResponse> detail(HttpServletRequest request, @PathVariable String id) {
        return ApiResponse.success(notificationChannelService.detail(tenantIdResolver.resolve(request), id));
    }

    @PostMapping
    public ApiResponse<NotificationChannelResponse> create(HttpServletRequest request,
                                                           @Valid @RequestBody NotificationChannelSaveRequest body) {
        return ApiResponse.success(notificationChannelService.create(tenantIdResolver.resolve(request), body));
    }

    @PutMapping("/{id}")
    public ApiResponse<NotificationChannelResponse> update(HttpServletRequest request,
                                                           @PathVariable String id,
                                                           @Valid @RequestBody NotificationChannelSaveRequest body) {
        return ApiResponse.success(notificationChannelService.update(tenantIdResolver.resolve(request), id, body));
    }

    @DeleteMapping("/{id}")
    public ApiResponse<Boolean> delete(HttpServletRequest request, @PathVariable String id) {
        notificationChannelService.delete(tenantIdResolver.resolve(request), id);
        return ApiResponse.success(Boolean.TRUE);
    }
}
