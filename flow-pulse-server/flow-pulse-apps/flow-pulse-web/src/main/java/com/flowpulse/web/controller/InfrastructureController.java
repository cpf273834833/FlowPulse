package com.flowpulse.web.controller;

import com.flowpulse.common.ApiResponse;
import com.flowpulse.infrastructure.api.request.InfrastructureQueryRequest;
import com.flowpulse.infrastructure.api.request.InfrastructureResourceQueryRequest;
import com.flowpulse.infrastructure.api.request.InfrastructureSaveRequest;
import com.flowpulse.infrastructure.api.response.EnvironmentOptionResponse;
import com.flowpulse.infrastructure.api.response.InfrastructureActionResponse;
import com.flowpulse.infrastructure.api.response.InfrastructurePageResponse;
import com.flowpulse.infrastructure.api.response.InfrastructureResourceResponse;
import com.flowpulse.infrastructure.api.response.InfrastructureResponse;
import com.flowpulse.infrastructure.api.response.PageResponse;
import com.flowpulse.infrastructure.api.response.RegionOptionResponse;
import com.flowpulse.infrastructure.application.InfrastructureApplicationService;
import com.flowpulse.management.api.response.EnvironmentRegionPageResponse;
import com.flowpulse.management.api.response.EnvironmentResponse;
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
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import javax.servlet.http.HttpServletRequest;
import javax.validation.Valid;
import java.util.ArrayList;
import java.util.List;

@Validated
@RestController
@RequestMapping("/frontapi/v1/infrastructure")
public class InfrastructureController {
    private final InfrastructureApplicationService infrastructureService;
    private final EnvironmentRegionService environmentRegionService;
    private final TenantIdResolver tenantIdResolver;

    public InfrastructureController(InfrastructureApplicationService infrastructureService,
                                    EnvironmentRegionService environmentRegionService,
                                    TenantIdResolver tenantIdResolver) {
        this.infrastructureService = infrastructureService;
        this.environmentRegionService = environmentRegionService;
        this.tenantIdResolver = tenantIdResolver;
    }

    @GetMapping("/page")
    public ApiResponse<InfrastructurePageResponse> page(HttpServletRequest request,
                                                        InfrastructureQueryRequest query) {
        String tenantId = tenantIdResolver.resolve(request);
        InfrastructurePageResponse response = infrastructureService.page(tenantId, query);
        EnvironmentRegionPageResponse environmentRegionPage = environmentRegionService.page(tenantId);
        response.setEnvironments(toEnvironmentOptions(environmentRegionPage.getEnvironments()));
        response.setRegions(toRegionOptions(environmentRegionPage.getRegions()));
        enrichNames(response);
        return ApiResponse.success(response);
    }

    @GetMapping("/{id}")
    public ApiResponse<InfrastructureResponse> detail(HttpServletRequest request, @PathVariable String id) {
        return ApiResponse.success(infrastructureService.detail(tenantIdResolver.resolve(request), id));
    }

    @PostMapping
    public ApiResponse<InfrastructureResponse> create(HttpServletRequest request,
                                                      @Valid @RequestBody InfrastructureSaveRequest body) {
        return ApiResponse.success(infrastructureService.create(tenantIdResolver.resolve(request), body));
    }

    @PutMapping("/{id}")
    public ApiResponse<InfrastructureResponse> update(HttpServletRequest request,
                                                      @PathVariable String id,
                                                      @Valid @RequestBody InfrastructureSaveRequest body) {
        return ApiResponse.success(infrastructureService.update(tenantIdResolver.resolve(request), id, body));
    }

    @PutMapping("/{id}/run-status")
    public ApiResponse<InfrastructureResponse> updateRunStatus(HttpServletRequest request,
                                                               @PathVariable String id,
                                                               @RequestParam("enabled") boolean enabled) {
        return ApiResponse.success(infrastructureService.updateRunStatus(tenantIdResolver.resolve(request), id, enabled));
    }

    @DeleteMapping("/{id}")
    public ApiResponse<Boolean> delete(HttpServletRequest request, @PathVariable String id) {
        infrastructureService.delete(tenantIdResolver.resolve(request), id);
        return ApiResponse.success(Boolean.TRUE);
    }

    @PostMapping("/{id}/test")
    public ApiResponse<InfrastructureActionResponse> test(HttpServletRequest request, @PathVariable String id) {
        return ApiResponse.success(infrastructureService.testConnection(tenantIdResolver.resolve(request), id));
    }

    @PostMapping("/{id}/sync")
    public ApiResponse<InfrastructureActionResponse> sync(HttpServletRequest request,
                                                          @PathVariable String id,
                                                          @RequestParam(value = "mode", required = false) String mode) {
        return ApiResponse.success(infrastructureService.syncResources(tenantIdResolver.resolve(request), id, mode));
    }

    @GetMapping("/{id}/resources")
    public ApiResponse<PageResponse<InfrastructureResourceResponse>> resources(HttpServletRequest request,
                                                                              @PathVariable String id,
                                                                              InfrastructureResourceQueryRequest query) {
        return ApiResponse.success(infrastructureService.resources(tenantIdResolver.resolve(request), id, query));
    }

    private void enrichNames(InfrastructurePageResponse response) {
        if (response.getInfrastructures() == null || response.getInfrastructures().getRecords() == null) {
            return;
        }
        for (InfrastructureResponse infrastructure : response.getInfrastructures().getRecords()) {
            for (int i = 0; i < response.getEnvironments().size(); i++) {
                if (response.getEnvironments().get(i).getId().equals(infrastructure.getEnvId())) {
                    infrastructure.setEnvName(response.getEnvironments().get(i).getEnvName());
                }
            }
            for (int i = 0; i < response.getRegions().size(); i++) {
                if (response.getRegions().get(i).getId().equals(infrastructure.getRegionId())) {
                    infrastructure.setRegionName(response.getRegions().get(i).getRegionName());
                }
            }
        }
    }

    private List<EnvironmentOptionResponse> toEnvironmentOptions(List<EnvironmentResponse> environments) {
        List<EnvironmentOptionResponse> options = new ArrayList<EnvironmentOptionResponse>();
        for (EnvironmentResponse environment : environments) {
            EnvironmentOptionResponse option = new EnvironmentOptionResponse();
            option.setId(environment.getId());
            option.setEnvCode(environment.getEnvCode());
            option.setEnvName(environment.getEnvName());
            options.add(option);
        }
        return options;
    }

    private List<RegionOptionResponse> toRegionOptions(List<RegionResponse> regions) {
        List<RegionOptionResponse> options = new ArrayList<RegionOptionResponse>();
        for (RegionResponse region : regions) {
            RegionOptionResponse option = new RegionOptionResponse();
            option.setId(region.getId());
            option.setEnvId(region.getEnvId());
            option.setParentRegionId(region.getParentRegionId());
            option.setRegionType(region.getRegionType());
            option.setRegionCode(region.getRegionCode());
            option.setRegionName(region.getRegionName());
            options.add(option);
        }
        return options;
    }
}
