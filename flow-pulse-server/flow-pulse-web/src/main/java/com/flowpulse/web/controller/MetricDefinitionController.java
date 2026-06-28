package com.flowpulse.web.controller;

import com.flowpulse.common.ApiResponse;
import com.flowpulse.metric.api.request.MetricDefinitionQueryRequest;
import com.flowpulse.metric.api.request.MetricDefinitionSaveRequest;
import com.flowpulse.metric.api.response.MetricDefinitionPageResponse;
import com.flowpulse.metric.api.response.MetricDefinitionResponse;
import com.flowpulse.metric.application.MetricDefinitionService;
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
@RequestMapping("/frontapi/v1/metrics")
public class MetricDefinitionController {
    private final MetricDefinitionService metricDefinitionService;
    private final TenantIdResolver tenantIdResolver;

    public MetricDefinitionController(MetricDefinitionService metricDefinitionService,
                                      TenantIdResolver tenantIdResolver) {
        this.metricDefinitionService = metricDefinitionService;
        this.tenantIdResolver = tenantIdResolver;
    }

    @GetMapping("/page")
    public ApiResponse<MetricDefinitionPageResponse> page(HttpServletRequest request, MetricDefinitionQueryRequest query) {
        return ApiResponse.success(metricDefinitionService.page(tenantIdResolver.resolve(request), query));
    }

    @GetMapping("/{id}")
    public ApiResponse<MetricDefinitionResponse> detail(HttpServletRequest request, @PathVariable String id) {
        return ApiResponse.success(metricDefinitionService.detail(tenantIdResolver.resolve(request), id));
    }

    @PostMapping
    public ApiResponse<MetricDefinitionResponse> create(HttpServletRequest request,
                                                        @Valid @RequestBody MetricDefinitionSaveRequest body) {
        return ApiResponse.success(metricDefinitionService.create(tenantIdResolver.resolve(request), body));
    }

    @PutMapping("/{id}")
    public ApiResponse<MetricDefinitionResponse> update(HttpServletRequest request,
                                                        @PathVariable String id,
                                                        @Valid @RequestBody MetricDefinitionSaveRequest body) {
        return ApiResponse.success(metricDefinitionService.update(tenantIdResolver.resolve(request), id, body));
    }

    @DeleteMapping("/{id}")
    public ApiResponse<Boolean> delete(HttpServletRequest request, @PathVariable String id) {
        metricDefinitionService.delete(tenantIdResolver.resolve(request), id);
        return ApiResponse.success(Boolean.TRUE);
    }
}
