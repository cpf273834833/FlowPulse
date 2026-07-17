alter table fp_resource_metric_config add column if not exists current_value double;
alter table fp_resource_metric_config add column if not exists current_value_at bigint;

update fp_resource_metric_config c
set current_value = (
        select s.metric_value
        from fp_metric_sample s
        where s.tenant_id = c.tenant_id
          and s.config_id = c.id
          and s.series_type = 'AGGREGATE'
          and s.instance = '__TOTAL__'
        order by s.collected_at desc
        limit 1
    ),
    current_value_at = (
        select max(s.collected_at)
        from fp_metric_sample s
        where s.tenant_id = c.tenant_id
          and s.config_id = c.id
          and s.series_type = 'AGGREGATE'
          and s.instance = '__TOTAL__'
    )
where c.current_value_at is null;

create index if not exists idx_fp_metric_sample_config_series_time
    on fp_metric_sample(tenant_id, config_id, series_type, instance, collected_at);
