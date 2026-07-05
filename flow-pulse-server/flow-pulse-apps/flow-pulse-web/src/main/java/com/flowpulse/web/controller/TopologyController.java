package com.flowpulse.web.controller;

import com.flowpulse.common.ApiResponse;
import com.flowpulse.topology.api.request.TopologyCanvasSaveRequest;
import com.flowpulse.topology.api.request.TopologyQueryRequest;
import com.flowpulse.topology.api.request.TopologySaveRequest;
import com.flowpulse.topology.api.response.TopologyDetailResponse;
import com.flowpulse.topology.api.response.TopologyPageResponse;
import com.flowpulse.topology.api.response.TopologyResponse;
import com.flowpulse.topology.api.response.TopologyRuntimeResponse;
import com.flowpulse.topology.application.TopologyService;
import com.flowpulse.web.application.TopologyRuntimeFacade;
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
@RequestMapping("/frontapi/v1/topologies")
public class TopologyController {
    private final TopologyService topologyService;
    private final TopologyRuntimeFacade topologyRuntimeFacade;
    private final TenantIdResolver tenantIdResolver;

    public TopologyController(TopologyService topologyService,
                              TopologyRuntimeFacade topologyRuntimeFacade,
                              TenantIdResolver tenantIdResolver) {
        this.topologyService = topologyService;
        this.topologyRuntimeFacade = topologyRuntimeFacade;
        this.tenantIdResolver = tenantIdResolver;
    }

    @GetMapping("/page")
    public ApiResponse<TopologyPageResponse> page(HttpServletRequest request, TopologyQueryRequest query) {
        String tenantId = tenantIdResolver.resolve(request);
        TopologyPageResponse response = topologyService.page(tenantId, query);
        topologyRuntimeFacade.fillTopologyLevels(tenantId, response);
        return ApiResponse.success(response);
    }

    @GetMapping("/{id}")
    public ApiResponse<TopologyDetailResponse> detail(HttpServletRequest request, @PathVariable String id) {
        return ApiResponse.success(topologyService.detail(tenantIdResolver.resolve(request), id));
    }

    @GetMapping("/{id}/runtime")
    public ApiResponse<TopologyRuntimeResponse> runtime(HttpServletRequest request, @PathVariable String id) {
        return ApiResponse.success(topologyRuntimeFacade.snapshot(tenantIdResolver.resolve(request), id));
    }

    @PostMapping
    public ApiResponse<TopologyResponse> create(HttpServletRequest request, @Valid @RequestBody TopologySaveRequest body) {
        return ApiResponse.success(topologyService.create(tenantIdResolver.resolve(request), body));
    }

    @PutMapping("/{id}")
    public ApiResponse<TopologyResponse> update(HttpServletRequest request, @PathVariable String id, @Valid @RequestBody TopologySaveRequest body) {
        return ApiResponse.success(topologyService.update(tenantIdResolver.resolve(request), id, body));
    }

    @PutMapping("/{id}/canvas")
    public ApiResponse<TopologyDetailResponse> saveCanvas(HttpServletRequest request, @PathVariable String id, @RequestBody TopologyCanvasSaveRequest body) {
        return ApiResponse.success(topologyService.saveCanvas(tenantIdResolver.resolve(request), id, body));
    }

    @DeleteMapping("/{id}")
    public ApiResponse<Boolean> delete(HttpServletRequest request, @PathVariable String id) {
        topologyService.delete(tenantIdResolver.resolve(request), id);
        return ApiResponse.success(Boolean.TRUE);
    }
}
