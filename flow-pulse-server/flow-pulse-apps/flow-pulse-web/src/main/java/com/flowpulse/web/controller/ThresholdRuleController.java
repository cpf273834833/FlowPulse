package com.flowpulse.web.controller;

import com.flowpulse.common.ApiResponse;
import com.flowpulse.metric.api.request.ThresholdRuleQueryRequest;
import com.flowpulse.metric.api.request.ThresholdRuleSaveRequest;
import com.flowpulse.metric.api.response.ThresholdRulePageResponse;
import com.flowpulse.metric.api.response.ThresholdRuleResponse;
import com.flowpulse.metric.application.ThresholdRuleService;
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
@RequestMapping("/frontapi/v1/threshold-rules")
public class ThresholdRuleController {
    private final ThresholdRuleService thresholdRuleService;
    private final TenantIdResolver tenantIdResolver;

    public ThresholdRuleController(ThresholdRuleService thresholdRuleService, TenantIdResolver tenantIdResolver) {
        this.thresholdRuleService = thresholdRuleService;
        this.tenantIdResolver = tenantIdResolver;
    }

    @GetMapping("/page")
    public ApiResponse<ThresholdRulePageResponse> page(HttpServletRequest request, ThresholdRuleQueryRequest query) {
        return ApiResponse.success(thresholdRuleService.page(tenantIdResolver.resolve(request), query));
    }

    @GetMapping("/{id}")
    public ApiResponse<ThresholdRuleResponse> detail(HttpServletRequest request, @PathVariable String id) {
        return ApiResponse.success(thresholdRuleService.detail(tenantIdResolver.resolve(request), id));
    }

    @PostMapping
    public ApiResponse<ThresholdRuleResponse> create(HttpServletRequest request,
                                                     @Valid @RequestBody ThresholdRuleSaveRequest body) {
        return ApiResponse.success(thresholdRuleService.create(tenantIdResolver.resolve(request), body));
    }

    @PutMapping("/{id}")
    public ApiResponse<ThresholdRuleResponse> update(HttpServletRequest request,
                                                     @PathVariable String id,
                                                     @Valid @RequestBody ThresholdRuleSaveRequest body) {
        return ApiResponse.success(thresholdRuleService.update(tenantIdResolver.resolve(request), id, body));
    }

    @DeleteMapping("/{id}")
    public ApiResponse<Boolean> delete(HttpServletRequest request, @PathVariable String id) {
        thresholdRuleService.delete(tenantIdResolver.resolve(request), id);
        return ApiResponse.success(Boolean.TRUE);
    }
}
