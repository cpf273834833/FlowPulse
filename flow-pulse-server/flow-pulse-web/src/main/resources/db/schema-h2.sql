create table if not exists fp_environment (
    id varchar(32) not null primary key,
    tenant_id varchar(32) not null,
    env_code varchar(64) not null,
    env_name varchar(128) not null,
    description varchar(512),
    created_at bigint not null,
    updated_at bigint not null
);

create unique index if not exists uk_fp_environment_code
    on fp_environment(tenant_id, env_code);

create table if not exists fp_region (
    id varchar(32) not null primary key,
    tenant_id varchar(32) not null,
    env_id varchar(32) not null,
    parent_region_id varchar(32),
    region_type varchar(32) not null,
    region_code varchar(64) not null,
    region_name varchar(128) not null,
    description varchar(512),
    created_at bigint not null,
    updated_at bigint not null
);

create unique index if not exists uk_fp_region_code
    on fp_region(tenant_id, env_id, region_code);

create index if not exists idx_fp_region_env
    on fp_region(tenant_id, env_id);

create index if not exists idx_fp_region_parent
    on fp_region(tenant_id, parent_region_id);

create table if not exists fp_platform_config (
    id varchar(32) not null primary key,
    tenant_id varchar(32) not null,
    env_id varchar(32) not null,
    region_id varchar(32) not null,
    name varchar(128) not null,
    platform_base_url varchar(512),
    omp_base_url varchar(512),
    platform_auth_type varchar(32) not null,
    platform_api_key varchar(256),
    omp_auth_type varchar(32) not null,
    omp_api_key varchar(256),
    sync_enabled boolean not null,
    sync_interval_sec int not null,
    platform_connection_status varchar(32) not null,
    omp_connection_status varchar(32) not null,
    status varchar(32) not null,
    created_at bigint not null,
    updated_at bigint not null
);

create unique index if not exists uk_fp_platform_config_region
    on fp_platform_config(tenant_id, region_id);

create table if not exists fp_infrastructure (
    id varchar(32) not null primary key,
    tenant_id varchar(32) not null,
    type varchar(32) not null,
    code varchar(64) not null,
    name varchar(128) not null,
    env_id varchar(32) not null,
    region_id varchar(32) not null,
    endpoint varchar(1024) not null,
    auth_type varchar(32) not null,
    username varchar(128),
    password varchar(256),
    api_key varchar(256),
    sync_scope varchar(1024),
    sync_mode varchar(32) not null default 'RECONCILE',
    sync_enabled boolean not null,
    sync_interval_sec int not null,
    run_status varchar(32) not null,
    connection_status varchar(32) not null,
    last_test_message varchar(1024),
    last_test_at bigint,
    last_sync_at bigint,
    last_sync_message varchar(1024),
    description varchar(512),
    created_at bigint not null,
    updated_at bigint not null
);

create unique index if not exists uk_fp_infrastructure_code
    on fp_infrastructure(tenant_id, code);

create index if not exists idx_fp_infrastructure_region
    on fp_infrastructure(tenant_id, env_id, region_id);

alter table fp_infrastructure add column if not exists sync_mode varchar(32) default 'RECONCILE';
update fp_infrastructure set sync_mode = 'RECONCILE' where sync_mode is null or sync_mode = '';

create table if not exists fp_infrastructure_resource (
    id varchar(32) not null primary key,
    tenant_id varchar(32) not null,
    infrastructure_id varchar(32) not null,
    resource_type varchar(64) not null,
    resource_name varchar(256) not null,
    resource_code varchar(512) not null,
    status varchar(32) not null,
    metadata_json clob,
    last_sync_at bigint not null,
    created_at bigint not null,
    updated_at bigint not null
);

create unique index if not exists uk_fp_infrastructure_resource
    on fp_infrastructure_resource(tenant_id, infrastructure_id, resource_type, resource_code);

create index if not exists idx_fp_infrastructure_resource_page
    on fp_infrastructure_resource(tenant_id, infrastructure_id, resource_type);

create table if not exists fp_executor_node (
    id varchar(32) not null primary key,
    tenant_id varchar(32) not null,
    env_id varchar(32) not null,
    region_id varchar(32) not null,
    host varchar(128) not null,
    ssh_port int,
    ssh_username varchar(128),
    ssh_password varchar(256),
    ssh_auth_type varchar(32) not null,
    ssh_private_key clob,
    java_home varchar(512),
    python_path varchar(512),
    source_type varchar(32) not null,
    ssh_supported boolean not null,
    agent_supported boolean not null,
    agent_status varchar(32) not null,
    connection_status varchar(32) not null,
    last_test_message varchar(1024),
    last_test_at bigint,
    last_sync_at bigint,
    created_at bigint not null,
    updated_at bigint not null
);

create unique index if not exists uk_fp_executor_node_host
    on fp_executor_node(tenant_id, env_id, region_id, host);

create index if not exists idx_fp_executor_node_page
    on fp_executor_node(tenant_id, env_id, region_id, source_type, connection_status);

alter table fp_executor_node add column if not exists java_home varchar(512);
alter table fp_executor_node add column if not exists python_path varchar(512);
update fp_executor_node set agent_supported = false, agent_status = 'UNKNOWN' where source_type = 'OMP';

create table if not exists fp_metric_definition (
    id varchar(32) not null primary key,
    tenant_id varchar(32) not null,
    metric_code varchar(128) not null,
    metric_name varchar(128) not null,
    metric_category varchar(32) not null,
    object_type varchar(64) not null,
    value_unit varchar(32),
    value_precision int not null,
    mapping_json clob,
    enabled boolean not null,
    description varchar(512),
    created_at bigint not null,
    updated_at bigint not null
);

create unique index if not exists uk_fp_metric_definition_code
    on fp_metric_definition(tenant_id, metric_code);

drop index if exists idx_fp_metric_definition_page;
alter table fp_metric_definition drop column if exists metric_source;
alter table fp_metric_definition drop column if exists collection_method;

create index if not exists idx_fp_metric_definition_page
    on fp_metric_definition(tenant_id, metric_category, object_type, enabled);

create table if not exists fp_metric_implementation (
    id varchar(32) not null primary key,
    tenant_id varchar(32) not null,
    metric_definition_id varchar(32) not null,
    implementation_code varchar(128) not null,
    implementation_name varchar(128) not null,
    implementation_type varchar(32) not null,
    execution_mode varchar(32) not null,
    script_language varchar(64),
    script_content clob,
    config_json clob,
    parameter_schema_json clob,
    output_schema_json clob,
    built_in_collector varchar(128),
    default_implementation boolean not null,
    enabled boolean not null,
    timeout_sec int not null,
    description varchar(512),
    created_at bigint not null,
    updated_at bigint not null
);

create unique index if not exists uk_fp_metric_implementation_code
    on fp_metric_implementation(tenant_id, implementation_code);

create index if not exists idx_fp_metric_implementation_page
    on fp_metric_implementation(tenant_id, metric_definition_id, implementation_type, enabled);

create index if not exists idx_fp_metric_implementation_default
    on fp_metric_implementation(tenant_id, metric_definition_id, default_implementation);

alter table fp_metric_implementation add column if not exists config_json clob;

create table if not exists fp_resource_metric_config (
    id varchar(32) not null primary key,
    tenant_id varchar(32) not null,
    object_type varchar(64) not null,
    object_id varchar(32) not null,
    object_code varchar(512) not null,
    object_name varchar(256) not null,
    metric_definition_id varchar(32) not null,
    implementation_id varchar(32) not null,
    execution_mode varchar(32) not null,
    executor_node_id varchar(32),
    interval_sec int not null,
    parameter_json clob,
    enabled boolean not null,
    task_status varchar(32) not null,
    last_collect_status varchar(32) not null,
    last_collect_message varchar(1024),
    last_collect_at bigint,
    next_collect_at bigint,
    description varchar(512),
    created_at bigint not null,
    updated_at bigint not null
);

create unique index if not exists uk_fp_resource_metric_config_object
    on fp_resource_metric_config(tenant_id, object_type, object_id, metric_definition_id);

create index if not exists idx_fp_resource_metric_config_page
    on fp_resource_metric_config(tenant_id, object_type, metric_definition_id, enabled);

create index if not exists idx_fp_resource_metric_config_task
    on fp_resource_metric_config(tenant_id, task_status, next_collect_at);
