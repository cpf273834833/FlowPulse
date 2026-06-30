package com.flowpulse.web.controller;

import com.flowpulse.common.ApiResponse;
import com.flowpulse.metric.api.request.ResourceMetricConfigQueryRequest;
import com.flowpulse.metric.api.request.ResourceMetricConfigSaveRequest;
import com.flowpulse.metric.api.response.ResourceMetricConfigPageResponse;
import com.flowpulse.metric.api.response.ResourceMetricConfigResponse;
import com.flowpulse.metric.application.ResourceMetricConfigService;
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

@Validated
@RestController
@RequestMapping("/frontapi/v1/metrics/resource-configs")
public class ResourceMetricConfigController {
    private final ResourceMetricConfigService resourceMetricConfigService;
    private final TenantIdResolver tenantIdResolver;

    public ResourceMetricConfigController(ResourceMetricConfigService resourceMetricConfigService,
                                          TenantIdResolver tenantIdResolver) {
        this.resourceMetricConfigService = resourceMetricConfigService;
        this.tenantIdResolver = tenantIdResolver;
    }

    @GetMapping("/page")
    public ApiResponse<ResourceMetricConfigPageResponse> page(HttpServletRequest request, ResourceMetricConfigQueryRequest query) {
        return ApiResponse.success(resourceMetricConfigService.page(tenantIdResolver.resolve(request), query));
    }

    @GetMapping("/{id}")
    public ApiResponse<ResourceMetricConfigResponse> detail(HttpServletRequest request, @PathVariable String id) {
        return ApiResponse.success(resourceMetricConfigService.detail(tenantIdResolver.resolve(request), id));
    }

    @PostMapping
    public ApiResponse<ResourceMetricConfigResponse> create(HttpServletRequest request,
                                                           @Valid @RequestBody ResourceMetricConfigSaveRequest body) {
        return ApiResponse.success(resourceMetricConfigService.create(tenantIdResolver.resolve(request), body));
    }

    @PutMapping("/{id}")
    public ApiResponse<ResourceMetricConfigResponse> update(HttpServletRequest request,
                                                           @PathVariable String id,
                                                           @Valid @RequestBody ResourceMetricConfigSaveRequest body) {
        return ApiResponse.success(resourceMetricConfigService.update(tenantIdResolver.resolve(request), id, body));
    }

    @DeleteMapping("/{id}")
    public ApiResponse<Boolean> delete(HttpServletRequest request, @PathVariable String id) {
        resourceMetricConfigService.delete(tenantIdResolver.resolve(request), id);
        return ApiResponse.success(Boolean.TRUE);
    }
}
