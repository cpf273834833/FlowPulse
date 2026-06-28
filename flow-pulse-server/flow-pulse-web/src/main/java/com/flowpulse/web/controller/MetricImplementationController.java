package com.flowpulse.web.controller;

import com.flowpulse.common.ApiResponse;
import com.flowpulse.metric.api.request.MetricImplementationQueryRequest;
import com.flowpulse.metric.api.request.MetricImplementationSaveRequest;
import com.flowpulse.metric.api.response.MetricImplementationPageResponse;
import com.flowpulse.metric.api.response.MetricImplementationResponse;
import com.flowpulse.metric.application.MetricImplementationService;
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
@RequestMapping("/frontapi/v1/metrics/implementations")
public class MetricImplementationController {
    private final MetricImplementationService metricImplementationService;
    private final TenantIdResolver tenantIdResolver;

    public MetricImplementationController(MetricImplementationService metricImplementationService,
                                          TenantIdResolver tenantIdResolver) {
        this.metricImplementationService = metricImplementationService;
        this.tenantIdResolver = tenantIdResolver;
    }

    @GetMapping("/page")
    public ApiResponse<MetricImplementationPageResponse> page(HttpServletRequest request, MetricImplementationQueryRequest query) {
        return ApiResponse.success(metricImplementationService.page(tenantIdResolver.resolve(request), query));
    }

    @GetMapping("/{id}")
    public ApiResponse<MetricImplementationResponse> detail(HttpServletRequest request, @PathVariable String id) {
        return ApiResponse.success(metricImplementationService.detail(tenantIdResolver.resolve(request), id));
    }

    @PostMapping
    public ApiResponse<MetricImplementationResponse> create(HttpServletRequest request,
                                                            @Valid @RequestBody MetricImplementationSaveRequest body) {
        return ApiResponse.success(metricImplementationService.create(tenantIdResolver.resolve(request), body));
    }

    @PutMapping("/{id}")
    public ApiResponse<MetricImplementationResponse> update(HttpServletRequest request,
                                                            @PathVariable String id,
                                                            @Valid @RequestBody MetricImplementationSaveRequest body) {
        return ApiResponse.success(metricImplementationService.update(tenantIdResolver.resolve(request), id, body));
    }

    @DeleteMapping("/{id}")
    public ApiResponse<Boolean> delete(HttpServletRequest request, @PathVariable String id) {
        metricImplementationService.delete(tenantIdResolver.resolve(request), id);
        return ApiResponse.success(Boolean.TRUE);
    }
}
