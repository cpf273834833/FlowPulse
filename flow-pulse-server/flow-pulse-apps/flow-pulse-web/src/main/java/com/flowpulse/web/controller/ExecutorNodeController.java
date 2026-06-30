package com.flowpulse.web.controller;

import com.flowpulse.common.ApiResponse;
import com.flowpulse.executor.api.request.ExecutorNodeQueryRequest;
import com.flowpulse.executor.api.request.ExecutorNodeSaveRequest;
import com.flowpulse.executor.api.response.ExecutorNodeActionResponse;
import com.flowpulse.executor.api.response.ExecutorNodePageResponse;
import com.flowpulse.executor.api.response.ExecutorNodeResponse;
import com.flowpulse.executor.application.ExecutorNodeService;
import com.flowpulse.web.support.TenantIdResolver;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import javax.servlet.http.HttpServletRequest;

@RestController
@RequestMapping("/frontapi/v1/executor-nodes")
public class ExecutorNodeController {
    private final ExecutorNodeService executorNodeService;
    private final TenantIdResolver tenantIdResolver;

    public ExecutorNodeController(ExecutorNodeService executorNodeService, TenantIdResolver tenantIdResolver) {
        this.executorNodeService = executorNodeService;
        this.tenantIdResolver = tenantIdResolver;
    }

    @GetMapping("/page")
    public ApiResponse<ExecutorNodePageResponse> page(HttpServletRequest request, ExecutorNodeQueryRequest query) {
        return ApiResponse.success(executorNodeService.page(tenantIdResolver.resolve(request), query));
    }

    @GetMapping("/{id}")
    public ApiResponse<ExecutorNodeResponse> detail(HttpServletRequest request, @PathVariable String id) {
        return ApiResponse.success(executorNodeService.detail(tenantIdResolver.resolve(request), id));
    }

    @PostMapping
    public ApiResponse<ExecutorNodeResponse> create(HttpServletRequest request, @RequestBody ExecutorNodeSaveRequest body) {
        return ApiResponse.success(executorNodeService.create(tenantIdResolver.resolve(request), body));
    }

    @PutMapping("/{id}")
    public ApiResponse<ExecutorNodeResponse> update(HttpServletRequest request,
                                                    @PathVariable String id,
                                                    @RequestBody ExecutorNodeSaveRequest body) {
        return ApiResponse.success(executorNodeService.update(tenantIdResolver.resolve(request), id, body));
    }

    @DeleteMapping("/{id}")
    public ApiResponse<Boolean> delete(HttpServletRequest request, @PathVariable String id) {
        executorNodeService.delete(tenantIdResolver.resolve(request), id);
        return ApiResponse.success(Boolean.TRUE);
    }

    @PostMapping("/{id}/test")
    public ApiResponse<ExecutorNodeActionResponse> test(HttpServletRequest request, @PathVariable String id) {
        return ApiResponse.success(executorNodeService.testConnection(tenantIdResolver.resolve(request), id));
    }

    @PostMapping("/sync-from-omp")
    public ApiResponse<ExecutorNodeActionResponse> syncFromOmp(HttpServletRequest request,
                                                               @RequestParam String regionId) {
        return ApiResponse.success(executorNodeService.syncFromOmp(tenantIdResolver.resolve(request), regionId));
    }
}
