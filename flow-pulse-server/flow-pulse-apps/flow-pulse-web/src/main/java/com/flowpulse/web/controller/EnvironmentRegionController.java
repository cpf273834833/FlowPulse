package com.flowpulse.web.controller;

import com.flowpulse.common.ApiResponse;
import com.flowpulse.management.api.request.EnvironmentSaveRequest;
import com.flowpulse.management.api.request.PlatformConfigSaveRequest;
import com.flowpulse.management.api.request.RegionSaveRequest;
import com.flowpulse.management.api.response.EnvironmentRegionPageResponse;
import com.flowpulse.management.api.response.EnvironmentResponse;
import com.flowpulse.management.api.response.PlatformConfigResponse;
import com.flowpulse.management.api.response.RegionResponse;
import com.flowpulse.management.application.EnvironmentRegionService;
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
@RequestMapping("/frontapi/v1/environment-region")
public class EnvironmentRegionController {
    private final EnvironmentRegionService service;
    private final TenantIdResolver tenantIdResolver;

    public EnvironmentRegionController(EnvironmentRegionService service, TenantIdResolver tenantIdResolver) {
        this.service = service;
        this.tenantIdResolver = tenantIdResolver;
    }

    @GetMapping("/page")
    public ApiResponse<EnvironmentRegionPageResponse> page(HttpServletRequest request) {
        return ApiResponse.success(service.page(tenantIdResolver.resolve(request)));
    }

    @PostMapping("/environments")
    public ApiResponse<EnvironmentResponse> createEnvironment(HttpServletRequest request,
                                                              @Valid @RequestBody EnvironmentSaveRequest body) {
        return ApiResponse.success(service.createEnvironment(tenantIdResolver.resolve(request), body));
    }

    @PutMapping("/environments/{id}")
    public ApiResponse<EnvironmentResponse> updateEnvironment(HttpServletRequest request,
                                                              @PathVariable String id,
                                                              @Valid @RequestBody EnvironmentSaveRequest body) {
        return ApiResponse.success(service.updateEnvironment(tenantIdResolver.resolve(request), id, body));
    }

    @DeleteMapping("/environments/{id}")
    public ApiResponse<Boolean> deleteEnvironment(HttpServletRequest request, @PathVariable String id) {
        service.deleteEnvironment(tenantIdResolver.resolve(request), id);
        return ApiResponse.success(Boolean.TRUE);
    }

    @PostMapping("/regions")
    public ApiResponse<RegionResponse> createRegion(HttpServletRequest request,
                                                    @Valid @RequestBody RegionSaveRequest body) {
        return ApiResponse.success(service.createRegion(tenantIdResolver.resolve(request), body));
    }

    @PutMapping("/regions/{id}")
    public ApiResponse<RegionResponse> updateRegion(HttpServletRequest request,
                                                    @PathVariable String id,
                                                    @Valid @RequestBody RegionSaveRequest body) {
        return ApiResponse.success(service.updateRegion(tenantIdResolver.resolve(request), id, body));
    }

    @DeleteMapping("/regions/{id}")
    public ApiResponse<Boolean> deleteRegion(HttpServletRequest request, @PathVariable String id) {
        service.deleteRegion(tenantIdResolver.resolve(request), id);
        return ApiResponse.success(Boolean.TRUE);
    }

    @PostMapping("/platform-configs")
    public ApiResponse<PlatformConfigResponse> savePlatformConfig(HttpServletRequest request,
                                                                  @Valid @RequestBody PlatformConfigSaveRequest body) {
        return ApiResponse.success(service.savePlatformConfig(tenantIdResolver.resolve(request), body));
    }

    @DeleteMapping("/platform-configs/{id}")
    public ApiResponse<Boolean> deletePlatformConfig(HttpServletRequest request, @PathVariable String id) {
        service.deletePlatformConfig(tenantIdResolver.resolve(request), id);
        return ApiResponse.success(Boolean.TRUE);
    }
}
