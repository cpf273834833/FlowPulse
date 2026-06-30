package com.flowpulse.web.controller;

import com.flowpulse.alert.api.request.AlertStateQueryRequest;
import com.flowpulse.alert.api.response.AlertDetailResponse;
import com.flowpulse.alert.api.response.AlertStatePageResponse;
import com.flowpulse.alert.api.response.AlertStateResponse;
import com.flowpulse.alert.application.AlertCenterService;
import com.flowpulse.common.ApiResponse;
import com.flowpulse.web.support.TenantIdResolver;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import javax.servlet.http.HttpServletRequest;

@Validated
@RestController
@RequestMapping("/frontapi/v1/alerts")
public class AlertCenterController {
    private final AlertCenterService alertCenterService;
    private final TenantIdResolver tenantIdResolver;

    public AlertCenterController(AlertCenterService alertCenterService, TenantIdResolver tenantIdResolver) {
        this.alertCenterService = alertCenterService;
        this.tenantIdResolver = tenantIdResolver;
    }

    @GetMapping("/page")
    public ApiResponse<AlertStatePageResponse> page(HttpServletRequest request, AlertStateQueryRequest query) {
        return ApiResponse.success(alertCenterService.page(tenantIdResolver.resolve(request), query));
    }

    @GetMapping("/{id}")
    public ApiResponse<AlertDetailResponse> detail(HttpServletRequest request, @PathVariable String id) {
        return ApiResponse.success(alertCenterService.detail(tenantIdResolver.resolve(request), id));
    }

    @PostMapping("/{id}/acknowledge")
    public ApiResponse<AlertStateResponse> acknowledge(HttpServletRequest request,
                                                       @PathVariable String id,
                                                       @RequestParam(required = false) String operator) {
        return ApiResponse.success(alertCenterService.acknowledge(tenantIdResolver.resolve(request), id, operator));
    }
}
