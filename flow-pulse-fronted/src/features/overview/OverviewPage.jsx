import React, { useEffect, useMemo, useState } from 'react';
import { alertApi } from '../../api/alertApi';
import { environmentRegionApi } from '../../api/environmentRegionApi';
import { executorNodeApi } from '../../api/executorNodeApi';
import { infrastructureApi } from '../../api/infrastructureApi';
import { logicalObjectApi } from '../../api/logicalObjectApi';
import { metricApi } from '../../api/metricApi';
import { topologyApi } from '../../api/topologyApi';
import { PageHeader, StatCards } from '../../components/PageChrome';

const EMPTY = {
  environments: 0, regions: 0, configuredRegions: 0, infrastructures: 0,
  healthyInfrastructure: 0, logicalObjects: 0, executorNodes: 0,
  collectionTasks: 0, collectionErrors: 0, topologies: 0, activeAlerts: 0,
};

export default function OverviewPage() {
  const [summary, setSummary] = useState(EMPTY);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    setError('');
    try {
      const [environment, infrastructure, logical, executor, configs, topologies, alerts] = await Promise.all([
        environmentRegionApi.page(),
        infrastructureApi.page({ pageNo: 1, pageSize: 1 }),
        logicalObjectApi.page({ pageNo: 1, pageSize: 1 }),
        executorNodeApi.page({ pageNo: 1, pageSize: 1 }),
        metricApi.resourceConfigPage({ pageNo: 1, pageSize: 200 }),
        topologyApi.page({ pageNo: 1, pageSize: 1 }),
        alertApi.page({ pageNo: 1, pageSize: 1, status: 'ACTIVE' }),
      ]);
      const infrastructureStats = indexStats(infrastructure.stats);
      const taskRecords = configs.configs?.records || [];
      setSummary({
        environments: environment.environments?.length || 0,
        regions: environment.regions?.length || 0,
        configuredRegions: environment.platformConfigs?.length || 0,
        infrastructures: infrastructure.infrastructures?.total || 0,
        healthyInfrastructure: Number(infrastructureStats['infrastructure.normal'] || 0),
        logicalObjects: logical.total || 0,
        executorNodes: executor.nodes?.total || 0,
        collectionTasks: configs.configs?.total || 0,
        collectionErrors: taskRecords.filter((item) => item.lastCollectStatus === 'ERROR').length,
        topologies: topologies.topologies?.total || 0,
        activeAlerts: alerts.alerts?.total || 0,
      });
    } catch (requestError) {
      setError(requestError.message || '总览数据加载失败');
    } finally {
      setLoading(false);
    }
  }

  const steps = useMemo(() => onboardingSteps(summary), [summary]);
  const completed = steps.filter((step) => step.done).length;
  const stats = [
    { key: 'infrastructure', title: '基础设施', value: summary.infrastructures, description: `连接正常 ${summary.healthyInfrastructure}`, tone: summary.infrastructures && summary.healthyInfrastructure < summary.infrastructures ? 'warning' : 'success' },
    { key: 'collection', title: '采集任务', value: summary.collectionTasks, description: `异常 ${summary.collectionErrors}`, tone: summary.collectionErrors ? 'danger' : 'success' },
    { key: 'topology', title: '数据流拓扑', value: summary.topologies, description: `逻辑对象 ${summary.logicalObjects}` },
    { key: 'alert', title: '活动告警', value: summary.activeAlerts, description: summary.activeAlerts ? '需要关注' : '当前无活动故障', tone: summary.activeAlerts ? 'danger' : 'success' },
  ];

  return (
    <section className="fp-page fp-overview-page">
      <PageHeader eyebrow="运行态势" title="运行总览" description="集中查看接入进度、采集健康、拓扑和活动告警。" actions={<button className="fp-button" type="button" disabled={loading} onClick={load}>{loading ? '刷新中...' : '刷新'}</button>} />
      {error ? <div className="fp-inline-error" role="alert">{error}</div> : null}
      <StatCards stats={stats} columns={4} />
      <div className="fp-overview-grid">
        <section className="fp-card fp-onboarding-card">
          <div className="fp-section-title"><div><h2>接入进度</h2><p>按顺序完成配置，建立第一条可观测数据流。</p></div><strong>{completed}/{steps.length}</strong></div>
          <div className="fp-progress"><span style={{ width: `${Math.round((completed / steps.length) * 100)}%` }} /></div>
          <div className="fp-onboarding-steps">
            {steps.map((step, index) => (
              <button className={step.done ? 'is-done' : ''} type="button" key={step.key} onClick={() => { window.location.hash = step.hash; }}>
                <em>{step.done ? '✓' : index + 1}</em><span><strong>{step.title}</strong><small>{step.description}</small></span><b>{step.done ? '已完成' : '去配置'}</b>
              </button>
            ))}
          </div>
        </section>
        <section className="fp-card fp-health-card">
          <div className="fp-section-title"><div><h2>需要关注</h2><p>优先处理会阻断采集和告警闭环的问题。</p></div></div>
          <HealthRow label="未配置接入的区域" value={Math.max(summary.regions - summary.configuredRegions, 0)} hash="/environment-region" />
          <HealthRow label="连接异常或未测试的基础设施" value={Math.max(summary.infrastructures - summary.healthyInfrastructure, 0)} hash="/infrastructure" />
          <HealthRow label="采集异常" value={summary.collectionErrors} hash="/collection-task" />
          <HealthRow label="活动告警" value={summary.activeAlerts} hash="/alert-center" />
        </section>
      </div>
    </section>
  );
}

function HealthRow({ label, value, hash }) {
  return <button className={value ? 'is-warning' : 'is-ok'} type="button" onClick={() => { window.location.hash = hash; }}><span>{label}</span><strong>{value}</strong><em>{value ? '查看处理' : '正常'}</em></button>;
}

function indexStats(stats = []) {
  return Object.fromEntries(stats.map((item) => [item.title, item.value]));
}

function onboardingSteps(summary) {
  return [
    { key: 'environment', title: '创建环境与区域', description: `${summary.environments} 个环境 / ${summary.regions} 个区域`, done: summary.environments > 0 && summary.regions > 0, hash: '/environment-region' },
    { key: 'infrastructure', title: '接入基础设施', description: `${summary.infrastructures} 个实例`, done: summary.infrastructures > 0, hash: '/infrastructure' },
    { key: 'logical', title: '建立逻辑对象', description: `${summary.logicalObjects} 个稳定对象`, done: summary.logicalObjects > 0, hash: '/logical-object' },
    { key: 'metric', title: '启用指标采集', description: `${summary.collectionTasks} 个采集任务`, done: summary.collectionTasks > 0, hash: '/collection-task' },
    { key: 'topology', title: '构建数据流拓扑', description: `${summary.topologies} 个拓扑`, done: summary.topologies > 0, hash: '/data-topology' },
    { key: 'alert', title: '配置阈值并验证告警', description: '检查告警触发与恢复闭环', done: summary.activeAlerts > 0, hash: '/threshold-management' },
  ];
}
