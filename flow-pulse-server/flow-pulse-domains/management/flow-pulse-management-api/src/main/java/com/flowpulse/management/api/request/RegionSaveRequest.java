package com.flowpulse.management.api.request;

import javax.validation.constraints.NotBlank;
import javax.validation.constraints.Size;

public class RegionSaveRequest {
    @NotBlank(message = "{region.envId.required}")
    @Size(min = 32, max = 32, message = "{region.envId.size}")
    private String envId;

    @Size(max = 32, message = "{region.parentRegionId.size}")
    private String parentRegionId;

    @NotBlank(message = "{region.regionType.required}")
    @Size(max = 32, message = "{region.regionType.size}")
    private String regionType;

    @NotBlank(message = "{region.regionCode.required}")
    @Size(max = 64, message = "{region.regionCode.size}")
    private String regionCode;

    @NotBlank(message = "{region.regionName.required}")
    @Size(max = 128, message = "{region.regionName.size}")
    private String regionName;

    @Size(max = 512, message = "{common.description.size}")
    private String description;

    public String getEnvId() {
        return envId;
    }

    public void setEnvId(String envId) {
        this.envId = envId;
    }

    public String getParentRegionId() {
        return parentRegionId;
    }

    public void setParentRegionId(String parentRegionId) {
        this.parentRegionId = parentRegionId;
    }

    public String getRegionType() {
        return regionType;
    }

    public void setRegionType(String regionType) {
        this.regionType = regionType;
    }

    public String getRegionCode() {
        return regionCode;
    }

    public void setRegionCode(String regionCode) {
        this.regionCode = regionCode;
    }

    public String getRegionName() {
        return regionName;
    }

    public void setRegionName(String regionName) {
        this.regionName = regionName;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }
}
