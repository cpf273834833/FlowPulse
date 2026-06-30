package com.flowpulse.web.controller;

import com.flowpulse.common.ApiResponse;
import com.flowpulse.resource.api.request.LogicalObjectInstanceQueryRequest;
import com.flowpulse.resource.api.request.LogicalObjectQueryRequest;
import com.flowpulse.resource.api.request.LogicalObjectSaveRequest;
import com.flowpulse.resource.api.response.LogicalObjectInstanceResponse;
import com.flowpulse.resource.api.response.LogicalObjectResponse;
import com.flowpulse.resource.api.response.PageResponse;
import com.flowpulse.resource.application.LogicalObjectService;
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
@RequestMapping("/frontapi/v1/logical-objects")
public class LogicalObjectController {
    private final LogicalObjectService logicalObjectService;
    private final TenantIdResolver tenantIdResolver;

    public LogicalObjectController(LogicalObjectService logicalObjectService, TenantIdResolver tenantIdResolver) {
        this.logicalObjectService = logicalObjectService;
        this.tenantIdResolver = tenantIdResolver;
    }

    @GetMapping("/page")
    public ApiResponse<PageResponse<LogicalObjectResponse>> page(HttpServletRequest request, LogicalObjectQueryRequest query) {
        return ApiResponse.success(logicalObjectService.page(tenantIdResolver.resolve(request), query));
    }

    @GetMapping("/{id}")
    public ApiResponse<LogicalObjectResponse> detail(HttpServletRequest request, @PathVariable String id) {
        return ApiResponse.success(logicalObjectService.detail(tenantIdResolver.resolve(request), id));
    }

    @PostMapping
    public ApiResponse<LogicalObjectResponse> create(HttpServletRequest request, @Valid @RequestBody LogicalObjectSaveRequest body) {
        return ApiResponse.success(logicalObjectService.create(tenantIdResolver.resolve(request), body));
    }

    @PutMapping("/{id}")
    public ApiResponse<LogicalObjectResponse> update(HttpServletRequest request, @PathVariable String id, @Valid @RequestBody LogicalObjectSaveRequest body) {
        return ApiResponse.success(logicalObjectService.update(tenantIdResolver.resolve(request), id, body));
    }

    @DeleteMapping("/{id}")
    public ApiResponse<Void> delete(HttpServletRequest request, @PathVariable String id) {
        logicalObjectService.delete(tenantIdResolver.resolve(request), id);
        return ApiResponse.success(null);
    }

    @PostMapping("/{id}/resolve")
    public ApiResponse<LogicalObjectResponse> resolve(HttpServletRequest request, @PathVariable String id) {
        return ApiResponse.success(logicalObjectService.resolveInstances(tenantIdResolver.resolve(request), id));
    }

    @GetMapping("/{id}/instances")
    public ApiResponse<PageResponse<LogicalObjectInstanceResponse>> instances(HttpServletRequest request, @PathVariable String id, LogicalObjectInstanceQueryRequest query) {
        return ApiResponse.success(logicalObjectService.instances(tenantIdResolver.resolve(request), id, query));
    }
}
