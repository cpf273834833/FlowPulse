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

create table if not exists fp_logical_object (
    id varchar(32) not null primary key,
    tenant_id varchar(32) not null,
    object_code varchar(64) not null,
    object_name varchar(128) not null,
    object_type varchar(64) not null,
    env_id varchar(32) not null,
    region_id varchar(32),
    source_type varchar(32) not null,
    source_infrastructure_id varchar(32),
    match_field varchar(64) not null,
    match_type varchar(32) not null,
    match_pattern varchar(1024),
    time_extract_regex varchar(512),
    time_format varchar(128),
    time_reference varchar(64),
    instance_filter_json clob,
    aggregation_json clob,
    output_metric_json clob,
    enabled boolean not null,
    description varchar(512),
    created_at bigint not null,
    updated_at bigint not null
);

create unique index if not exists uk_fp_logical_object_code
    on fp_logical_object(tenant_id, object_code);

create index if not exists idx_fp_logical_object_scope
    on fp_logical_object(tenant_id, env_id, region_id, object_type);

create table if not exists fp_logical_object_instance (
    id varchar(32) not null primary key,
    tenant_id varchar(32) not null,
    logical_object_id varchar(32) not null,
    physical_object_type varchar(64) not null,
    physical_object_id varchar(128),
    physical_object_code varchar(512) not null,
    physical_object_name varchar(512),
    status varchar(32) not null,
    metric_json clob,
    first_seen_at bigint not null,
    last_seen_at bigint not null,
    metadata_json clob,
    created_at bigint not null,
    updated_at bigint not null
);

create unique index if not exists uk_fp_logical_object_instance
    on fp_logical_object_instance(tenant_id, logical_object_id, physical_object_type, physical_object_code);

create index if not exists idx_fp_logical_object_instance_seen
    on fp_logical_object_instance(tenant_id, logical_object_id, status, last_seen_at);

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
    metric_kind varchar(32),
    instance_dimension varchar(64),
    source_metric_code varchar(128),
    derive_type varchar(32),
    parameter_schema_json clob,
    mapping_json clob,
    system_builtin boolean not null default false,
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
alter table fp_metric_definition drop column if exists default_aggregation;
alter table fp_metric_definition add column if not exists parameter_schema_json clob;
alter table fp_metric_definition add column if not exists metric_kind varchar(32);
alter table fp_metric_definition add column if not exists instance_dimension varchar(64);
alter table fp_metric_definition add column if not exists source_metric_code varchar(128);
alter table fp_metric_definition add column if not exists derive_type varchar(32);
alter table fp_metric_definition add column if not exists system_builtin boolean not null default false;
update fp_metric_definition set metric_kind = 'RAW' where metric_kind is null or metric_kind = '';

create index if not exists idx_fp_metric_definition_page
    on fp_metric_definition(tenant_id, metric_category, object_type, enabled);

create table if not exists fp_metric_applicability (
    id varchar(32) not null primary key,
    tenant_id varchar(32) not null,
    metric_definition_id varchar(32) not null,
    scope_type varchar(32) not null,
    object_type varchar(64),
    relation_type varchar(64),
    source_object_type varchar(64),
    target_object_type varchar(64),
    collect_anchor varchar(32),
    required_params_json clob,
    enabled boolean not null,
    description varchar(512),
    created_at bigint not null,
    updated_at bigint not null
);

create index if not exists idx_fp_metric_applicability_lookup
    on fp_metric_applicability(tenant_id, scope_type, object_type, relation_type, source_object_type, target_object_type, enabled);

create index if not exists idx_fp_metric_applicability_metric
    on fp_metric_applicability(tenant_id, metric_definition_id);

alter table fp_metric_applicability add column if not exists collect_anchor varchar(32);
alter table fp_metric_applicability add column if not exists required_params_json clob;

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
    parameter_schema_json clob,
    output_schema_json clob,
    built_in_collector varchar(128),
    default_implementation boolean not null,
    system_builtin boolean not null default false,
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

alter table fp_metric_implementation add column if not exists system_builtin boolean not null default false;

create table if not exists fp_system_migration (
    migration_key varchar(128) not null primary key,
    applied_at bigint not null
);

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
    parameter_signature varchar(64) not null default '',
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

drop index if exists uk_fp_resource_metric_config_object;

alter table fp_resource_metric_config add column if not exists parameter_signature varchar(64) not null default '';
update fp_resource_metric_config set parameter_signature = 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'
where parameter_signature is null or parameter_signature = '';

create unique index if not exists uk_fp_resource_metric_config_object
    on fp_resource_metric_config(tenant_id, object_type, object_id, metric_definition_id, parameter_signature);

create index if not exists idx_fp_resource_metric_config_page
    on fp_resource_metric_config(tenant_id, object_type, metric_definition_id, enabled);

create index if not exists idx_fp_resource_metric_config_task
    on fp_resource_metric_config(tenant_id, task_status, next_collect_at);

create table if not exists fp_metric_sample (
    id varchar(32) not null primary key,
    tenant_id varchar(32) not null,
    config_id varchar(32) not null,
    metric_definition_id varchar(32) not null,
    metric_code varchar(128) not null,
    object_type varchar(64) not null,
    object_id varchar(32) not null,
    object_code varchar(512) not null,
    infrastructure_type varchar(64),
    infrastructure_id varchar(32),
    instance varchar(128),
    series_type varchar(32),
    quality varchar(32),
    metric_value double not null,
    collected_at bigint not null,
    metadata_json clob,
    created_at bigint not null
);

create index if not exists idx_fp_metric_sample_config_time
    on fp_metric_sample(tenant_id, config_id, collected_at);

create index if not exists idx_fp_metric_sample_metric_object
    on fp_metric_sample(tenant_id, metric_definition_id, object_type, object_id, collected_at);

alter table fp_metric_sample add column if not exists infrastructure_type varchar(64);
alter table fp_metric_sample add column if not exists infrastructure_id varchar(32);
alter table fp_metric_sample add column if not exists instance varchar(128);
alter table fp_metric_sample add column if not exists series_type varchar(32);
alter table fp_metric_sample drop column if exists aggregation;
alter table fp_metric_sample add column if not exists quality varchar(32);
update fp_metric_sample set instance = '__TOTAL__' where instance is null or instance = '';
update fp_metric_sample set series_type = 'AGGREGATE' where series_type is null or series_type = '';
update fp_metric_sample set quality = 'NORMAL' where quality is null or quality = '';

create index if not exists idx_fp_metric_sample_series_time
    on fp_metric_sample(tenant_id, metric_code, object_type, object_id, instance, series_type, collected_at);

create table if not exists fp_metric_collect_record (
    id varchar(32) not null primary key,
    tenant_id varchar(32) not null,
    config_id varchar(32) not null,
    metric_definition_id varchar(32) not null,
    metric_code varchar(128) not null,
    implementation_id varchar(32) not null,
    implementation_code varchar(128),
    object_type varchar(64) not null,
    object_id varchar(32) not null,
    object_code varchar(512) not null,
    execution_mode varchar(32) not null,
    executor_node_id varchar(32),
    status varchar(32) not null,
    metric_value double,
    message varchar(1024),
    started_at bigint not null,
    finished_at bigint not null,
    duration_ms bigint not null,
    created_at bigint not null
);

create index if not exists idx_fp_metric_collect_record_config_time
    on fp_metric_collect_record(tenant_id, config_id, started_at);

create index if not exists idx_fp_metric_collect_record_status
    on fp_metric_collect_record(tenant_id, status, started_at);

create table if not exists fp_threshold_rule (
    id varchar(32) not null primary key,
    tenant_id varchar(32) not null,
    rule_code varchar(128) not null,
    rule_name varchar(128) not null,
    metric_definition_id varchar(32) not null,
    scope_type varchar(32) not null,
    object_type varchar(64),
    object_id varchar(32),
    object_code varchar(512),
    object_name varchar(256),
    topology_id varchar(32),
    topology_element_id varchar(32),
    topology_element_type varchar(32),
    conditions_json clob not null,
    evaluation_window_sec int not null,
    consecutive_count int not null,
    recovery_policy varchar(32) not null,
    enabled boolean not null,
    description varchar(512),
    created_at bigint not null,
    updated_at bigint not null
);

create unique index if not exists uk_fp_threshold_rule_code
    on fp_threshold_rule(tenant_id, rule_code);

create index if not exists idx_fp_threshold_rule_page
    on fp_threshold_rule(tenant_id, metric_definition_id, scope_type, enabled);

create index if not exists idx_fp_threshold_rule_object
    on fp_threshold_rule(tenant_id, object_type, object_id);

create table if not exists fp_alert_state (
    id varchar(32) not null primary key,
    tenant_id varchar(32) not null,
    alert_key varchar(256) not null,
    rule_id varchar(32) not null,
    metric_definition_id varchar(32) not null,
    object_type varchar(64) not null,
    object_id varchar(32) not null,
    object_code varchar(512),
    object_name varchar(256),
    topology_id varchar(32),
    topology_element_id varchar(32),
    topology_element_type varchar(32),
    current_level varchar(32) not null,
    previous_level varchar(32) not null,
    status varchar(32) not null,
    first_triggered_at bigint,
    last_changed_at bigint not null,
    last_evaluated_at bigint,
    recovered_at bigint,
    trigger_value double,
    message varchar(1024),
    reason_json clob,
    acknowledged boolean not null,
    acknowledged_by varchar(128),
    acknowledged_at bigint,
    created_at bigint not null,
    updated_at bigint not null
);

create unique index if not exists uk_fp_alert_state_key
    on fp_alert_state(tenant_id, alert_key);

create index if not exists idx_fp_alert_state_page
    on fp_alert_state(tenant_id, current_level, status, object_type);

create index if not exists idx_fp_alert_state_topology
    on fp_alert_state(tenant_id, topology_id, topology_element_id, status);

create table if not exists fp_alert_event (
    id varchar(32) not null primary key,
    tenant_id varchar(32) not null,
    alert_state_id varchar(32) not null,
    alert_key varchar(256) not null,
    from_level varchar(32) not null,
    to_level varchar(32) not null,
    event_type varchar(32) not null,
    event_at bigint not null,
    trigger_value double,
    message varchar(1024),
    reason_json clob,
    created_at bigint not null
);

create index if not exists idx_fp_alert_event_state
    on fp_alert_event(tenant_id, alert_state_id, event_at);

create table if not exists fp_notification_channel (
    id varchar(32) not null primary key,
    tenant_id varchar(32) not null,
    channel_code varchar(128) not null,
    channel_name varchar(128) not null,
    channel_type varchar(32) not null,
    endpoint varchar(512) not null,
    api_key varchar(256),
    enabled boolean not null,
    description varchar(512),
    created_at bigint not null,
    updated_at bigint not null
);

create unique index if not exists uk_fp_notification_channel_code
    on fp_notification_channel(tenant_id, channel_code);

create table if not exists fp_notification_record (
    id varchar(32) not null primary key,
    tenant_id varchar(32) not null,
    alert_state_id varchar(32) not null,
    alert_event_id varchar(32),
    channel_id varchar(32) not null,
    notify_type varchar(32) not null,
    notify_status varchar(32) not null,
    request_json clob,
    response_json clob,
    error_message varchar(1024),
    sent_at bigint,
    created_at bigint not null,
    updated_at bigint not null
);

create index if not exists idx_fp_notification_record_alert
    on fp_notification_record(tenant_id, alert_state_id, created_at);

create table if not exists fp_topology (
    id varchar(32) not null primary key,
    tenant_id varchar(32) not null,
    topology_code varchar(128) not null,
    topology_name varchar(128) not null,
    env_id varchar(32) not null,
    description varchar(512),
    canvas_config_json clob,
    created_at bigint not null,
    updated_at bigint not null
);

create unique index if not exists uk_fp_topology_code
    on fp_topology(tenant_id, topology_code);

create index if not exists idx_fp_topology_page
    on fp_topology(tenant_id, env_id, updated_at);

create table if not exists fp_topology_node (
    id varchar(32) not null primary key,
    tenant_id varchar(32) not null,
    topology_id varchar(32) not null,
    node_key varchar(128) not null,
    node_name varchar(128) not null,
    node_type varchar(64) not null,
    object_type varchar(64) not null,
    object_id varchar(32) not null,
    object_code varchar(512),
    object_name varchar(256),
    x double not null,
    y double not null,
    width double not null,
    height double not null,
    style_json clob,
    metric_display_json clob,
    hidden boolean not null,
    group_key varchar(128),
    created_at bigint not null,
    updated_at bigint not null
);

create unique index if not exists uk_fp_topology_node_key
    on fp_topology_node(tenant_id, topology_id, node_key);

create index if not exists idx_fp_topology_node_object
    on fp_topology_node(tenant_id, object_type, object_id);

create table if not exists fp_topology_edge (
    id varchar(32) not null primary key,
    tenant_id varchar(32) not null,
    topology_id varchar(32) not null,
    edge_key varchar(128) not null,
    edge_name varchar(128) not null,
    edge_type varchar(64) not null,
    source_node_id varchar(32) not null,
    target_node_id varchar(32) not null,
    relation_type varchar(64) not null,
    relation_id varchar(32),
    source_object_type varchar(64),
    source_object_id varchar(32),
    target_object_type varchar(64),
    target_object_id varchar(32),
    path_json clob,
    label_position_json clob,
    style_json clob,
    metric_display_json clob,
    hidden boolean not null,
    created_at bigint not null,
    updated_at bigint not null
);

create unique index if not exists uk_fp_topology_edge_key
    on fp_topology_edge(tenant_id, topology_id, edge_key);

create index if not exists idx_fp_topology_edge_relation
    on fp_topology_edge(tenant_id, relation_type, relation_id);

alter table fp_topology_edge add column if not exists source_object_type varchar(64);
alter table fp_topology_edge add column if not exists source_object_id varchar(32);
alter table fp_topology_edge add column if not exists target_object_type varchar(64);
alter table fp_topology_edge add column if not exists target_object_id varchar(32);

update fp_topology_edge e
set source_object_type = (select n.object_type from fp_topology_node n where n.tenant_id = e.tenant_id and n.id = e.source_node_id),
    source_object_id = (select n.object_id from fp_topology_node n where n.tenant_id = e.tenant_id and n.id = e.source_node_id),
    target_object_type = (select n.object_type from fp_topology_node n where n.tenant_id = e.tenant_id and n.id = e.target_node_id),
    target_object_id = (select n.object_id from fp_topology_node n where n.tenant_id = e.tenant_id and n.id = e.target_node_id)
where source_object_type is null or source_object_type = '' or target_object_type is null or target_object_type = '';
