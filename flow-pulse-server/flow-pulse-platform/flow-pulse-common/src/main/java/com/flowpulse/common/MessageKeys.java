package com.flowpulse.common;

public final class MessageKeys {
    public static final String TENANT_ID_INVALID = "tenant.id.invalid";

    public static final String ENVIRONMENT_NOT_FOUND = "environment.not.found";
    public static final String ENVIRONMENT_CODE_EXISTS = "environment.code.exists";
    public static final String ENVIRONMENT_DELETE_HAS_REGION = "environment.delete.has.region";

    public static final String REGION_NOT_FOUND = "region.not.found";
    public static final String REGION_CODE_EXISTS = "region.code.exists";
    public static final String REGION_TYPE_INVALID = "region.type.invalid";
    public static final String REGION_COMPUTE_PARENT_REQUIRED = "region.compute.parent.required";
    public static final String REGION_COMPUTE_PARENT_INVALID = "region.compute.parent.invalid";
    public static final String REGION_DELETE_HAS_COMPUTE = "region.delete.has.compute";
    public static final String REGION_DELETE_HAS_CONFIG = "region.delete.has.config";

    public static final String PLATFORM_CONFIG_NOT_FOUND = "platform.config.not.found";
    public static final String PLATFORM_CONFIG_DEFAULT_NAME = "platform.config.default.name";

    public static final String INFRASTRUCTURE_NOT_FOUND = "infrastructure.not.found";
    public static final String INFRASTRUCTURE_CODE_EXISTS = "infrastructure.code.exists";
    public static final String INFRASTRUCTURE_TYPE_INVALID = "infrastructure.type.invalid";
    public static final String INFRASTRUCTURE_DELETE_HAS_RESOURCE = "infrastructure.delete.has.resource";
    public static final String INFRASTRUCTURE_CONNECTOR_NOT_FOUND = "infrastructure.connector.not.found";

    public static final String EXECUTOR_NODE_NOT_FOUND = "executor.node.not.found";
    public static final String EXECUTOR_NODE_HOST_EXISTS = "executor.node.host.exists";
    public static final String EXECUTOR_NODE_HOST_REQUIRED = "executor.node.host.required";
    public static final String EXECUTOR_NODE_REGION_REQUIRED = "executor.node.region.required";
    public static final String EXECUTOR_NODE_OMP_CONFIG_REQUIRED = "executor.node.omp.config.required";
    public static final String EXECUTOR_NODE_OMP_SYNC_FAILED = "executor.node.omp.sync.failed";
    public static final String EXECUTOR_NODE_SSH_CONFIG_REQUIRED = "executor.node.ssh.config.required";

    public static final String STATS_ENVIRONMENT_TITLE = "stats.environment.title";
    public static final String STATS_ENVIRONMENT_DESC = "stats.environment.desc";
    public static final String STATS_MANAGEMENT_REGION_TITLE = "stats.management.region.title";
    public static final String STATS_MANAGEMENT_REGION_DESC = "stats.management.region.desc";
    public static final String STATS_COMPUTE_REGION_TITLE = "stats.compute.region.title";
    public static final String STATS_COMPUTE_REGION_DESC = "stats.compute.region.desc";
    public static final String STATS_REGION_CONFIG_TITLE = "stats.region.config.title";
    public static final String STATS_REGION_CONFIG_DESC = "stats.region.config.desc";
    public static final String STATS_CONFIGURED_REGION_TITLE = "stats.configured.region.title";
    public static final String STATS_CONFIGURED_REGION_DESC = "stats.configured.region.desc";

    private MessageKeys() {
    }
}
