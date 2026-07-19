import React, { useEffect, useMemo, useState } from 'react';
import ApiOutlined from '@uyun/icons/ApiOutlined';
import CloudSyncOutlined from '@uyun/icons/CloudSyncOutlined';
import DatabaseOutlined from '@uyun/icons/DatabaseOutlined';
import DeleteOutlined from '@uyun/icons/DeleteOutlined';
import EditOutlined from '@uyun/icons/EditOutlined';
import PlusOutlined from '@uyun/icons/PlusOutlined';
import SearchOutlined from '@uyun/icons/SearchOutlined';
import { alertApi } from '../../api/alertApi';
import { executorNodeApi } from '../../api/executorNodeApi';
import { infrastructureApi } from '../../api/infrastructureApi';
import { metricApi } from '../../api/metricApi';
import { thresholdApi } from '../../api/thresholdApi';
import ConfirmDialog from '../../components/ConfirmDialog';
import EnvironmentScopeTree from '../../components/EnvironmentScopeTree';
import ManagementTable from '../../components/ManagementTable';
import Pagination from '../../components/Pagination';
import { StatIcon } from '../../components/PageChrome';
import Toast from '../../components/Toast';
import { t } from '../../i18n';

const EMPTY_PAGE = {
  stats: [],
  infrastructures: { records: [], total: 0, pageNo: 1, pageSize: 10 },
  environments: [],
  regions: [],
};

const DEFAULT_FORM = {
  type: 'KAFKA',
  code: '',
  name: '',
  envId: '',
  regionId: '',
  endpoint: '',
  authType: 'NONE',
  username: '',
  password: '',
  apiKey: '',
  syncScope: '*',
  syncMode: 'RECONCILE',
  syncEnabled: true,
  syncIntervalSec: 300,
  description: '',
};

const TYPE_OPTIONS = [
  ['KAFKA', 'Kafka'],
  ['SPARK', 'Spark'],
  ['ELASTICSEARCH', 'Elasticsearch'],
];

const STATUS_OPTIONS = [
  ['', 'infrastructure.allStatus'],
  ['NORMAL', 'infrastructure.statusNormal'],
  ['ERROR', 'infrastructure.statusError'],
  ['UNKNOWN', 'infrastructure.statusUnknown'],
];

const SYNC_MODE_OPTIONS = [
  ['RECONCILE', 'infrastructure.syncModeReconcile'],
  ['APPEND', 'infrastructure.syncModeAppend'],
  ['REFRESH', 'infrastructure.syncModeRefresh'],
];

const EXECUTION_OPTIONS = [['SERVER', 'SERVER'], ['SSH', 'SSH'], ['AGENT', 'AGENT'], ['EXPRESSION', 'EXPRESSION']];

const QUICK_THRESHOLD_SEVERITIES = [
  ['REMIND', 'threshold.severity.remind'],
  ['WARNING', 'threshold.severity.warning'],
  ['ERROR', 'threshold.severity.error'],
  ['CRITICAL', 'threshold.severity.critical'],
  ['URGENT', 'threshold.severity.urgent'],
];

export default function InfrastructurePage() {
  const [page, setPage] = useState(EMPTY_PAGE);
  const [query, setQuery] = useState({ pageNo: 1, pageSize: 10 });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [formPage, setFormPage] = useState(null);
  const [confirm, setConfirm] = useState(null);
  const [detailId, setDetailId] = useState('');
  const [testingId, setTestingId] = useState('');
  const [syncingId, setSyncingId] = useState('');
  const [resources, setResources] = useState({ records: [], total: 0, pageNo: 1, pageSize: 10 });
  const [resourceQuery, setResourceQuery] = useState({ pageNo: 1, pageSize: 10 });
  const [syncMode, setSyncMode] = useState('RECONCILE');
  const [metricDefinitions, setMetricDefinitions] = useState([]);
  const [metricImplementations, setMetricImplementations] = useState([]);
  const [metricConfigs, setMetricConfigs] = useState({ configs: { records: [], total: 0, pageNo: 1, pageSize: 10 } });
  const [metricConfigQuery, setMetricConfigQuery] = useState({ pageNo: 1, pageSize: 200 });
  const [metricConfigPage, setMetricConfigPage] = useState(null);
  const [thresholdConfigPage, setThresholdConfigPage] = useState(null);
  const [thresholdRules, setThresholdRules] = useState([]);
  const [activeAlerts, setActiveAlerts] = useState([]);
  const [listActiveAlerts, setListActiveAlerts] = useState([]);
  const [executorNodes, setExecutorNodes] = useState([]);

  const envIndex = useMemo(() => indexById(page.environments), [page.environments]);
  const regionIndex = useMemo(() => indexById(page.regions), [page.regions]);
  const selectedScopeLabel = useMemo(() => scopeLabel(query, envIndex, regionIndex), [query, envIndex, regionIndex]);
  const detail = page.infrastructures.records.find((item) => item.id === detailId);
  const listAlertsByObject = useMemo(() => groupAlertsByObject(listActiveAlerts), [listActiveAlerts]);

  useEffect(() => {
    load(query);
    loadMetricOptions();
  }, []);

  useEffect(() => {
    if (!message) {
      return undefined;
    }
    const timer = window.setTimeout(() => setMessage(''), 3000);
    return () => window.clearTimeout(timer);
  }, [message]);

  useEffect(() => {
    if (detailId) {
      const current = page.infrastructures.records.find((item) => item.id === detailId);
      setSyncMode((current && current.syncMode) || 'RECONCILE');
      loadResources(detailId, resourceQuery);
      if (current) {
        loadInfrastructureMetricConfigs(current, metricConfigQuery);
        loadInfrastructureThresholdRules(current);
        loadInfrastructureAlerts(current);
      }
    }
  }, [detailId]);

  async function load(nextQuery = query) {
    setLoading(true);
    try {
      const [data, alertData] = await Promise.all([
        infrastructureApi.page(nextQuery),
        alertApi.page({ pageNo: 1, pageSize: 500, status: 'ACTIVE' }),
      ]);
      setPage(data || EMPTY_PAGE);
      setListActiveAlerts((alertData.alerts && alertData.alerts.records) || []);
      setQuery(nextQuery);
    } catch (error) {
      setMessage(error.message);
    } finally {
      setLoading(false);
    }
  }

  async function loadResources(id, nextQuery = resourceQuery) {
    try {
      const data = await infrastructureApi.resources(id, nextQuery);
      setResources(data || { records: [], total: 0, pageNo: 1, pageSize: 10 });
      setResourceQuery(nextQuery);
    } catch (error) {
      setMessage(error.message);
    }
  }

  async function loadMetricOptions() {
    try {
      const [metricPage, implementationPage, executorNodePage] = await Promise.all([
        metricApi.page({ pageNo: 1, pageSize: 200, enabled: 'true' }),
        metricApi.implementationPage({ pageNo: 1, pageSize: 500, enabled: 'true' }),
        executorNodeApi.page({ pageNo: 1, pageSize: 500 }),
      ]);
      setMetricDefinitions((metricPage.metrics && metricPage.metrics.records) || []);
      setMetricImplementations((implementationPage.implementations && implementationPage.implementations.records) || []);
      setExecutorNodes((executorNodePage.nodes && executorNodePage.nodes.records) || []);
    } catch (error) {
      setMessage(error.message);
    }
  }

  async function loadInfrastructureMetricConfigs(item, nextQuery = metricConfigQuery) {
    if (!item || !item.id) {
      return;
    }
    try {
      const data = await metricApi.resourceConfigPage({
        ...nextQuery,
        objectType: item.type,
        objectId: item.id,
      });
      setMetricConfigs(data || { configs: { records: [], total: 0, pageNo: 1, pageSize: 10 } });
      setMetricConfigQuery(nextQuery);
    } catch (error) {
      setMessage(error.message);
    }
  }

  async function loadInfrastructureThresholdRules(item) {
    if (!item || !item.id) {
      setThresholdRules([]);
      return;
    }
    try {
      const data = await thresholdApi.page({
        pageNo: 1,
        pageSize: 200,
        objectType: item.type,
        objectId: item.id,
        scopeType: 'RESOURCE',
      });
      setThresholdRules((data.rules && data.rules.records) || []);
    } catch (error) {
      setMessage(error.message);
    }
  }

  async function loadInfrastructureAlerts(item) {
    if (!item || !item.id) {
      setActiveAlerts([]);
      return;
    }
    try {
      const data = await alertApi.page({
        pageNo: 1,
        pageSize: 100,
        status: 'ACTIVE',
        objectType: item.type,
      });
      const records = (data.alerts && data.alerts.records) || [];
      setActiveAlerts(records.filter((alert) => alert.objectId === item.id));
    } catch (error) {
      setMessage(error.message);
    }
  }

  function openMetricConfig(item = null, metric = null) {
    setMetricConfigPage(item ? { mode: 'edit', form: item } : { mode: 'create', form: defaultInfrastructureMetricConfig(detail, metric) });
  }

  function openDetail(id) {
    window.scrollTo({ top: 0, behavior: 'auto' });
    setDetailId(id);
  }

  function openThresholdConfig(row) {
    if (!detail || !row || !row.metric) {
      return;
    }
    setThresholdConfigPage({
      metric: row.metric,
      config: row.config,
      rule: row.thresholds && row.thresholds.length ? row.thresholds[0] : null,
    });
  }

  async function saveInfrastructureMetricConfig(form) {
    if (!detail) {
      return;
    }
    if (!form.metricDefinitionId) {
      setMessage(t('infrastructure.metricRequired'));
      return;
    }
    if ((form.executionMode === 'SSH' || form.executionMode === 'AGENT') && !form.executorNodeId && form.enabled !== false) {
      setMessage(t('metric.executorNodeRequired'));
      return;
    }
    try {
      const payload = normalizeInfrastructureMetricConfig(form, detail);
      if (form.id) {
        await metricApi.updateResourceConfig(form.id, payload);
      } else {
        await metricApi.createResourceConfig(payload);
      }
      setMetricConfigPage(null);
      setMessage(t('infrastructure.metricConfigSaved'));
      await loadInfrastructureMetricConfigs(detail, metricConfigQuery);
      await loadInfrastructureThresholdRules(detail);
    } catch (error) {
      setMessage(error.message);
    }
  }

  async function saveQuickThreshold(form) {
    if (!detail || !thresholdConfigPage) {
      return;
    }
    const payload = normalizeQuickThreshold(form, detail, thresholdConfigPage.metric);
    if (!payload.conditionsJson) {
      setMessage(t('threshold.conditionRequired'));
      return;
    }
    try {
      if (thresholdConfigPage.rule && thresholdConfigPage.rule.id) {
        await thresholdApi.update(thresholdConfigPage.rule.id, payload);
      } else {
        await thresholdApi.create(payload);
      }
      setThresholdConfigPage(null);
      setMessage(t('threshold.saved'));
      await loadInfrastructureThresholdRules(detail);
      await loadInfrastructureAlerts(detail);
    } catch (error) {
      setMessage(error.message);
    }
  }

  async function submit(form) {
    try {
      let saved;
      if (form.id) {
        saved = await infrastructureApi.update(form.id, form);
      } else {
        saved = await infrastructureApi.create(form);
      }
      setFormPage(null);
      setMessage(t('infrastructure.saved'));
      await load(query);
      if (form.id || (saved && saved.id)) {
        setDetailId(form.id || saved.id);
      }
    } catch (error) {
      setMessage(error.message);
    }
  }

  async function toggleRun(item) {
    try {
      if (item.runStatus !== 'ENABLED' && item.connectionStatus !== 'NORMAL') {
        setMessage(t('infrastructure.enableNeedTest'));
        return;
      }
      await infrastructureApi.updateRunStatus(item.id, item.runStatus !== 'ENABLED');
      await load(query);
    } catch (error) {
      setMessage(error.message);
    }
  }

  async function test(item) {
    if (testingId) {
      return;
    }
    setTestingId(item.id);
    try {
      const result = await infrastructureApi.test(item.id);
      setMessage(actionMessage('test', item, result));
      await load(query);
    } catch (error) {
      setMessage(actionMessage('test', item, { status: 'ERROR', message: error.message }));
    } finally {
      setTestingId('');
    }
  }

  async function sync(item) {
    if (syncingId) {
      return;
    }
    setSyncingId(item.id);
    try {
      const result = await infrastructureApi.sync(item.id, syncMode);
      setMessage(actionMessage('sync', item, result));
      await load(query);
      if (detailId === item.id) {
        await loadResources(item.id, resourceQuery);
      }
    } catch (error) {
      setMessage(actionMessage('sync', item, { status: 'ERROR', message: error.message }));
    } finally {
      setSyncingId('');
    }
  }

  async function changeSyncMode(item, nextSyncMode) {
    setSyncMode(nextSyncMode);
    try {
      await infrastructureApi.update(item.id, normalizeFormByAuth({ ...item, syncMode: nextSyncMode }));
      await load(query);
    } catch (error) {
      setMessage(error.message);
    }
  }

  async function copyText(value) {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        try {
          await navigator.clipboard.writeText(value || '');
          return true;
        } catch (error) {
          // Fall back to the legacy path below when the browser blocks Clipboard API.
        }
      }
      const input = document.createElement('textarea');
      input.value = value || '';
      input.setAttribute('readonly', 'readonly');
      input.style.position = 'fixed';
      input.style.left = '-9999px';
      document.body.appendChild(input);
      input.select();
      const copied = document.execCommand('copy');
      document.body.removeChild(input);
      return copied || Boolean(value);
    } catch (error) {
      return false;
    }
  }

  function selectScope(envId, regionId = '') {
    load({ ...query, envId, regionId, pageNo: 1 });
  }

  function openForm(item) {
    const defaultEnvId = page.environments[0] && page.environments[0].id;
    const defaultRegions = page.regions.filter((region) => !defaultEnvId || region.envId === defaultEnvId);
    setFormPage({
      title: item ? `${t('infrastructure.edit')}：${item.name || item.code}` : t('infrastructure.add'),
      form: item
        ? normalizeFormByAuth({ ...DEFAULT_FORM, ...item })
        : { ...DEFAULT_FORM, envId: defaultEnvId, regionId: defaultRegions[0] && defaultRegions[0].id },
    });
  }

  function requestDelete(item) {
    setConfirm({
      title: t('confirmDelete'),
      content: t('deleteConfirmContent', item.name),
      onConfirm: async () => {
        try {
          await infrastructureApi.delete(item.id);
          setConfirm(null);
          setDetailId('');
          setMessage(t('deleteSuccess'));
          await load(query);
        } catch (error) {
          setConfirm(null);
          setMessage(error.message);
        }
      },
    });
  }

  if (formPage) {
    return (
      <InfrastructureFormPage
        dialog={formPage}
        setDialog={setFormPage}
        onSubmit={submit}
        page={page}
        onBack={() => setFormPage(null)}
        message={message}
        onClearMessage={() => setMessage('')}
      />
    );
  }

  if (detail && metricConfigPage) {
    return (
      <InfrastructureMetricConfigPage
        detail={detail}
        env={envIndex[detail.envId]}
        region={regionIndex[detail.regionId]}
        formPage={metricConfigPage}
        metrics={metricDefinitions}
        implementations={metricImplementations}
        executorNodes={executorNodes}
        onBack={() => setMetricConfigPage(null)}
        onSubmit={saveInfrastructureMetricConfig}
        message={message}
        onClearMessage={() => setMessage('')}
      />
    );
  }

  if (detail && thresholdConfigPage) {
    return (
      <InfrastructureThresholdConfigPage
        detail={detail}
        env={envIndex[detail.envId]}
        region={regionIndex[detail.regionId]}
        configPage={thresholdConfigPage}
        onBack={() => setThresholdConfigPage(null)}
        onSubmit={saveQuickThreshold}
        message={message}
        onClearMessage={() => setMessage('')}
      />
    );
  }

  if (detail) {
    const connectionStatus = effectiveConnectionStatus(detail);
    const instanceEnabled = detail.runStatus === 'ENABLED';
    return (
      <section className="fp-page fp-infra-detail-page">
        <button className="fp-link-button fp-back-link fp-infra-back" type="button" onClick={() => setDetailId('')}>
          {t('infrastructure.back')}
        </button>
        <div className="fp-infra-detail-hero">
          <div className={`fp-infra-avatar fp-infra-avatar--${detail.type.toLowerCase()}`}>{infrastructureTypeInitials(detail.type)}</div>
          <div className="fp-infra-detail-title">
            <div className="fp-infra-title-row">
              <h1>{detail.name}</h1>
              <span className={`fp-type-tag fp-type-tag--${detail.type.toLowerCase()}`}>{infrastructureTypeLabel(detail.type)}</span>
            </div>
            <p>{detail.description || t('infrastructure.noDescription')}</p>
            <div className="fp-infra-hero-meta">
              <span>{detail.code}</span>
              <span>{envIndex[detail.envId]?.envName || '-'}</span>
              <span>{regionIndex[detail.regionId]?.regionName || '-'}</span>
              {activeAlerts.length > 0 ? (
                <button className="fp-infra-alert-link" type="button" onClick={() => { window.location.hash = '#/alert-center'; }}>
                  {t('infrastructure.activeAlert')} {activeAlerts.length} · 查看
                </button>
              ) : null}
            </div>
          </div>
          <aside className="fp-infra-action-panel">
            <div className="fp-infra-action-panel__top">
              <StatusPill status={connectionStatus} />
              <button className={`fp-switch ${instanceEnabled ? 'is-on' : ''}`} type="button" onClick={() => toggleRun(detail)}>
                <span />
                {instanceEnabled ? t('infrastructure.runEnabled') : t('infrastructure.runDisabled')}
              </button>
            </div>
            <div className="fp-infra-action-panel__endpoint">
              <span>{connectionEndpointLabel(detail.type)}</span>
              <strong title={detail.endpoint}>{detail.endpoint}</strong>
              <CopyButton value={detail.endpoint} onCopy={copyText} />
            </div>
            <div className="fp-infra-action-panel__mini">
              <span>{t('infrastructure.authType')}</span>
              <strong>{detail.authType || 'NONE'}</strong>
            </div>
            <div className="fp-infra-action-panel__time">
              <span>{t('infrastructure.lastTest')}</span>
              <strong>{formatTime(detail.lastTestAt)}</strong>
            </div>
            <div className="fp-infra-action-panel__mini fp-infra-action-panel__result">
              <span>{t('infrastructure.lastTestMessage')}</span>
              <strong title={normalizeActionMessage(detail.lastTestMessage) || '-'}>{connectionTestSummary(detail.lastTestMessage)}</strong>
            </div>
            <div className="fp-actions fp-actions--wrap">
              <button className="fp-button" type="button" onClick={() => openForm(detail)}><EditOutlined />{t('edit')}</button>
              <button className={`fp-button fp-button--primary fp-infra-test-button ${testingId === detail.id ? 'is-loading' : ''}`} type="button" aria-busy={testingId === detail.id} disabled={testingId === detail.id} onClick={() => test(detail)}>
                <ApiOutlined />{testingId === detail.id ? t('infrastructure.testing') : t('infrastructure.test')}
              </button>
              <button className="fp-button fp-button--ghost-danger" type="button" onClick={() => requestDelete(detail)}><DeleteOutlined />{t('delete')}</button>
            </div>
          </aside>
        </div>

        <Toast message={message} onClose={() => setMessage('')} />

        <InfrastructureRuntimeOverview
          detail={detail}
          metrics={filterInfrastructureMetrics(metricDefinitions, detail.type)}
          configs={metricConfigs.configs.records}
          thresholds={thresholdRules}
          alerts={activeAlerts}
          connectionStatus={connectionStatus}
        />

        <div className="fp-infra-detail-grid">
          <main className="fp-infra-detail-main">
        <InfrastructureMetricBoard
          detail={detail}
          metrics={filterInfrastructureMetrics(metricDefinitions, detail.type)}
          configs={metricConfigs.configs.records}
          thresholds={thresholdRules}
          alerts={activeAlerts}
          executorNodes={executorNodes}
          instanceEnabled={instanceEnabled}
          onAdd={(metric) => openMetricConfig(null, metric)}
          onEdit={(config) => openMetricConfig(config)}
          onThreshold={openThresholdConfig}
        />

            <section className="fp-card fp-infra-sync-summary">
              <h2>{t('infrastructure.syncConfig')}</h2>
              <div className="fp-infra-sync-summary__items">
                <Info label={t('infrastructure.syncScope')} value={detail.syncScope || '*'} />
                <Info label={t('infrastructure.syncInterval')} value={`${detail.syncIntervalSec || 0}s`} />
                <Info label={t('infrastructure.syncEnabled')} value={detail.syncEnabled ? t('yes') : t('no')} />
                <Info label={t('infrastructure.lastSync')} value={formatTime(detail.lastSyncAt)} />
                <Info label={t('infrastructure.lastSyncMessage')} value={normalizeActionMessage(detail.lastSyncMessage) || '-'} />
              </div>
            </section>

        <section className="fp-card fp-resource-card fp-infra-work-card">
          <div className="fp-section-title">
          <h2>{t('infrastructure.resources')}</h2>
          <div className="fp-resource-toolbar">
            <div className="fp-inline-search">
              <SearchOutlined />
              <input
                value={resourceQuery.keyword || ''}
                placeholder={t('infrastructure.searchResource')}
                onChange={(event) => setResourceQuery({ ...resourceQuery, keyword: event.target.value, pageNo: 1 })}
                onKeyDown={(event) => { if (event.key === 'Enter') loadResources(detail.id, { ...resourceQuery, pageNo: 1 }); }}
              />
            </div>
            <SelectBare value={syncMode} options={SYNC_MODE_OPTIONS} onChange={(value) => changeSyncMode(detail, value)} />
            <button className={`fp-button fp-button--primary fp-resource-sync-button ${syncingId === detail.id ? 'is-loading' : ''}`} type="button" disabled={syncingId === detail.id} onClick={() => sync(detail)}><CloudSyncOutlined />{syncingId === detail.id ? t('loading') : t('infrastructure.sync')}</button>
          </div>
          </div>
          <ManagementTable
            className="fp-resource-management-table"
            columns={[
              { key: 'name', label: '资源名称', width: 'minmax(240px, 1.8fr)' },
              { key: 'type', label: t('infrastructure.resourceType'), width: 'minmax(130px, .8fr)' },
              { key: 'status', label: '状态', width: '100px' },
              { key: 'sync', label: t('infrastructure.lastSync'), width: '180px' },
            ]}
            rows={resources.records}
            emptyText={t('empty')}
            renderCells={(resource) => [
              <strong title={resource.resourceName}>{resource.resourceName}</strong>,
              <span>{resource.resourceType || '-'}</span>,
              <ResourceStatus status={resource.status} />,
              <span>{formatTime(resource.lastSyncAt)}</span>,
            ]}
          />
          <Pagination
            pageNo={resources.pageNo}
            pageSize={resources.pageSize}
            total={resources.total}
            onChange={(next) => loadResources(detail.id, { ...resourceQuery, ...next })}
          />
        </section>
          </main>
        </div>
        {confirm ? <ConfirmDialog title={confirm.title} content={confirm.content} onCancel={() => setConfirm(null)} onConfirm={confirm.onConfirm} /> : null}
      </section>
    );
  }

  return (
    <section className="fp-page">
      <div className="fp-page__header">
        <div>
          <h1>{t('menuInfrastructure')}</h1>
          <p>{t('infrastructure.pageDesc')}</p>
        </div>
        <button className="fp-button fp-button--primary" type="button" onClick={() => openForm()}>
          <PlusOutlined />
          {t('infrastructure.add')}
        </button>
      </div>

      <Toast message={message} onClose={() => setMessage('')} />

      <div className="fp-stat-grid">
        {page.stats.map((stat, index) => (
          <div className="fp-stat" key={stat.title}>
            <StatIcon stat={{ ...stat, title: t(stat.title) }} />
            <div>
              <span>{t(stat.title)}</span>
              <strong>{stat.value}</strong>
              <em>{t(stat.description)}</em>
            </div>
          </div>
        ))}
      </div>

      <section className="fp-card fp-infra-list">
        <div className="fp-section-title">
          <h2>{t('infrastructure.list')}</h2>
          {loading ? <span className="fp-muted-text">{t('loading')}</span> : null}
        </div>
        <div className="fp-infra-workspace">
          <EnvironmentScopeTree
            environments={page.environments}
            regions={page.regions}
            selectedEnvId={query.envId || ''}
            selectedRegionId={query.regionId || ''}
            onSelect={selectScope}
            title={t('infrastructure.scopeTree')}
            allLabel={t('infrastructure.allScope')}
            managementLabel={t('managementRegion')}
            computeLabel={t('computeRegion')}
          />
          <div className="fp-infra-content">
            <div className="fp-infra-content__bar">
              <div>
                <strong>{selectedScopeLabel}</strong>
                <span>{t('infrastructure.instanceCount', page.infrastructures.total)}</span>
              </div>
              <div className="fp-filter-row fp-filter-row--compact">
                <div className="fp-inline-search">
                  <SearchOutlined />
                  <input value={query.keyword || ''} placeholder={t('infrastructure.searchByName')} onChange={(event) => setQuery({ ...query, keyword: event.target.value, pageNo: 1 })} />
                </div>
                <SelectBare value={query.status || ''} options={STATUS_OPTIONS} onChange={(status) => setQuery({ ...query, status, pageNo: 1 })} />
                <button className="fp-button" type="button" onClick={() => load({ ...query, pageNo: 1 })}>{t('filter')}</button>
              </div>
            </div>
            <div className="fp-infra-grid">
              {page.infrastructures.records.length === 0 ? <div className="fp-empty">{t('empty')}</div> : null}
              {page.infrastructures.records.map((item) => {
                const cardAlert = listAlertsByObject[item.id];
                return (
                <article className={`fp-infra-card ${cardAlert ? `is-alert is-${cardAlert.currentLevel}` : ''}`} key={item.id}>
                  <div className="fp-infra-card__top">
                    <div className="fp-infra-card__identity">
                      <button className="fp-card-title-button" type="button" onClick={() => openDetail(item.id)}>
                        {item.name}
                      </button>
                      <span className={`fp-type-tag fp-type-tag--${item.type.toLowerCase()}`}>{item.type}</span>
                      <em>{item.code}</em>
                    </div>
                    <button className={`fp-switch ${item.runStatus === 'ENABLED' ? 'is-on' : ''}`} type="button" onClick={() => toggleRun(item)}>
                      <span />
                      {item.runStatus === 'ENABLED' ? t('infrastructure.runEnabled') : t('infrastructure.runDisabled')}
                    </button>
                  </div>
                  <div className="fp-infra-status-line">
                    <div className="fp-infra-card-statuses">
                      <StatusPill status={effectiveConnectionStatus(item)} />
                      {cardAlert ? <span className={`fp-infra-alert-chip fp-infra-alert-chip--compact is-${cardAlert.currentLevel}`}>{levelText(cardAlert.currentLevel)}</span> : null}
                    </div>
                    <button className={`fp-button fp-button--small fp-infra-test-button ${testingId === item.id ? 'is-loading' : ''}`} type="button" aria-busy={testingId === item.id} disabled={testingId === item.id} onClick={() => test(item)}>
                      {testingId === item.id ? t('infrastructure.testing') : t('infrastructure.test')}
                    </button>
                  </div>
                  <div className="fp-infra-meta">
                    <span title={`${envIndex[item.envId]?.envName || '-'} / ${regionIndex[item.regionId]?.regionName || '-'}`}>{`${envIndex[item.envId]?.envName || '-'} / ${regionIndex[item.regionId]?.regionName || '-'}`}</span>
                    <span title={`${t('infrastructure.syncScope')} ${item.syncScope || '*'}`}>{t('infrastructure.syncScope')} {item.syncScope || '*'}</span>
                    <span title={`${t('infrastructure.lastSync')} ${formatTime(item.lastSyncAt)}`}>{t('infrastructure.lastSync')} {formatTime(item.lastSyncAt)}</span>
                  </div>
                  <div className="fp-infra-endpoint">
                    <span>{item.endpoint}</span>
                    <CopyButton value={item.endpoint} onCopy={copyText} />
                  </div>
                  <p>{item.description || t('infrastructure.noDescription')}</p>
                </article>
                );
              })}
            </div>
            <Pagination
              pageNo={page.infrastructures.pageNo}
              pageSize={page.infrastructures.pageSize}
              total={page.infrastructures.total}
              onChange={(next) => load({ ...query, ...next })}
            />
          </div>
        </div>
      </section>
      {confirm ? <ConfirmDialog title={confirm.title} content={confirm.content} onCancel={() => setConfirm(null)} onConfirm={confirm.onConfirm} /> : null}
    </section>
  );
}

function InfrastructureFormPage({ dialog, setDialog, onSubmit, page, onBack, message, onClearMessage }) {
  const [form, setForm] = useState(dialog.form);
  const regions = page.regions.filter((region) => !form.envId || region.envId === form.envId);
  const authType = form.authType || 'NONE';
  const isEdit = Boolean(form.id);
  return (
    <section className="fp-page fp-infra-config-page">
      <button className="fp-link-button fp-back-link fp-infra-back" type="button" onClick={onBack}>
        {t('infrastructure.back')}
      </button>
      <Toast message={message} onClose={onClearMessage} />
      <div className="fp-infra-config-shell">
        <aside className="fp-infra-config-aside">
          <span className="fp-kicker">{form.id ? t('infrastructure.edit') : t('infrastructure.add')}</span>
          <h1>{dialog.title}</h1>
          <p>{isEdit ? t('infrastructure.editImmutableHint') : t('infrastructure.formPageDesc')}</p>
          <div className="fp-infra-config-preview">
            <span className={`fp-type-tag fp-type-tag--${(form.type || 'KAFKA').toLowerCase()}`}>{form.type}</span>
            <strong>{form.name || t('infrastructure.name')}</strong>
            <em>{form.code || t('infrastructure.code')}</em>
            <small>{form.endpoint || t('infrastructure.endpoint')}</small>
          </div>
          <div className="fp-actions fp-actions--stack">
            <button className="fp-button fp-button--primary" type="button" onClick={() => onSubmit(normalizeFormByAuth(form))}>{t('save')}</button>
            <button className="fp-button" type="button" onClick={() => setDialog(null)}>{t('cancel')}</button>
          </div>
        </aside>
        <div className="fp-infra-config-main">
          <FormGroup title={t('infrastructure.basicSection')} desc={t('infrastructure.basicSectionDesc')}>
            <FieldSelect label={t('infrastructure.type')} value={form.type} options={TYPE_OPTIONS} onChange={(type) => setForm({ ...form, type })} />
            <Field label={t('infrastructure.code')} value={form.code} onChange={(code) => setForm({ ...form, code })} disabled={isEdit} />
            <Field label={t('infrastructure.name')} value={form.name} onChange={(name) => setForm({ ...form, name })} />
            <FieldSelect label={t('regionEnv')} value={form.envId} options={page.environments.map((env) => [env.id, env.envName])} disabled={isEdit} onChange={(envId) => {
              const nextRegions = page.regions.filter((region) => region.envId === envId);
              setForm({ ...form, envId, regionId: nextRegions[0] && nextRegions[0].id });
            }} />
            <FieldSelect label={t('infrastructure.region')} value={form.regionId} options={regions.map((region) => [region.id, region.regionName])} onChange={(regionId) => setForm({ ...form, regionId })} disabled={isEdit} />
            <Field label={t('description')} value={form.description} onChange={(description) => setForm({ ...form, description })} />
          </FormGroup>
          <FormGroup title={t('infrastructure.connectionInfo')} desc={endpointHint(form.type)}>
            <Field label={t('infrastructure.endpoint')} value={form.endpoint} onChange={(endpoint) => setForm({ ...form, endpoint })} hint={endpointHint(form.type)} wide />
            <FieldSelect label={t('infrastructure.authType')} value={authType} options={[['NONE', 'NONE'], ['BASIC', 'BASIC'], ['API_KEY', 'API_KEY']]} onChange={(nextAuthType) => setForm(normalizeFormByAuth({ ...form, authType: nextAuthType }))} />
            {authType === 'BASIC' ? <Field label={t('infrastructure.username')} value={form.username} onChange={(username) => setForm({ ...form, username })} /> : null}
            {authType === 'BASIC' ? <Field label={t('infrastructure.password')} value={form.password} onChange={(password) => setForm({ ...form, password })} type="password" autoComplete="new-password" /> : null}
            {authType === 'API_KEY' ? <Field label={t('infrastructure.apiKey')} value={form.apiKey} onChange={(apiKey) => setForm({ ...form, apiKey })} wide /> : null}
          </FormGroup>
          <FormGroup title={t('infrastructure.syncSection')} desc={t('infrastructure.syncSectionDesc')}>
            <Field label={t('infrastructure.syncScope')} value={form.syncScope} onChange={(syncScope) => setForm({ ...form, syncScope })} hint={t('infrastructure.syncScopeHint')} wide />
            <FieldSelect label={t('infrastructure.syncMode')} value={form.syncMode || 'RECONCILE'} options={SYNC_MODE_OPTIONS} onChange={(syncMode) => setForm({ ...form, syncMode })} />
            <Field label={t('infrastructure.syncInterval')} value={form.syncIntervalSec} onChange={(syncIntervalSec) => setForm({ ...form, syncIntervalSec: Number(syncIntervalSec) })} type="number" />
          </FormGroup>
        </div>
      </div>
    </section>
  );
}

function InfrastructureMetricConfigPage({ detail, env, region, formPage, metrics, implementations, executorNodes, onBack, onSubmit, message, onClearMessage }) {
  const [form, setForm] = useState(formPage.form);
  const availableMetrics = useMemo(() => filterInfrastructureMetrics(metrics, detail.type), [metrics, detail.type]);
  const availableImplementations = useMemo(
    () => implementations.filter((item) => item.metricDefinitionId === form.metricDefinitionId),
    [implementations, form.metricDefinitionId],
  );
  const availableExecutorNodes = useMemo(
    () => filterExecutorNodes(executorNodes, detail, form.executionMode),
    [executorNodes, detail, form.executionMode],
  );
  const selectedMetric = availableMetrics.find((item) => item.id === form.metricDefinitionId);
  const title = formPage.mode === 'edit' ? t('infrastructure.editMetricConfig') : t('infrastructure.addMetricConfig');
  const needExecutorNode = form.executionMode === 'SSH' || form.executionMode === 'AGENT';

  return (
    <section className="fp-page fp-infra-config-page">
      <button className="fp-link-button fp-back-link fp-infra-back" type="button" onClick={onBack}>
        {t('infrastructure.backToDetail')}
      </button>
      <Toast message={message} onClose={onClearMessage} />
      <div className="fp-infra-config-shell">
        <aside className="fp-infra-config-aside">
          <span className="fp-kicker">{t('infrastructure.metricConfig')}</span>
          <h1>{title}</h1>
          <p>{t('infrastructure.metricConfigPageDesc', detail.name)}</p>
          <div className="fp-infra-config-preview">
            <span className={`fp-type-tag fp-type-tag--${detail.type.toLowerCase()}`}>{detail.type}</span>
            <strong>{detail.name}</strong>
            <em>{detail.code}</em>
            <small>{env?.envName || '-'} / {region?.regionName || '-'}</small>
          </div>
          <div className="fp-infra-metric-preview">
            <span>{t('metric.name')}</span>
            <strong>{selectedMetric ? selectedMetric.metricName : t('selectPlaceholder')}</strong>
            <em>{selectedMetric ? selectedMetric.metricCode : '-'}</em>
          </div>
          <div className="fp-actions fp-actions--stack">
          <button className="fp-button fp-button--primary" type="button" onClick={() => onSubmit(form)}>{t('save')}</button>
            <button className="fp-button" type="button" onClick={onBack}>{t('cancel')}</button>
          </div>
        </aside>

        <main className="fp-infra-config-main">
          <FormGroup title={t('infrastructure.metricObject')} desc={t('infrastructure.metricConfigDesc')}>
            <Info label={t('infrastructure.name')} value={detail.name} />
            <Info label={t('infrastructure.code')} value={detail.code} />
            <Info label={t('infrastructure.type')} value={detail.type} />
            <Info label={t('regionEnv')} value={env?.envName || '-'} />
            <Info label={t('infrastructure.region')} value={region?.regionName || '-'} />
            <Info label={t('infrastructure.endpoint')} value={detail.endpoint} />
          </FormGroup>
          <FormGroup title={t('infrastructure.metricCollectConfig')} desc={t('infrastructure.metricParameterDesc')}>
            <FieldSelect
              label={t('metric.name')}
              value={form.metricDefinitionId}
              options={availableMetrics.map((item) => [item.id, `${item.metricName} / ${item.metricCode}`])}
              onChange={(metricDefinitionId) => setForm({ ...form, metricDefinitionId, implementationId: '' })}
            />
            <FieldSelect
              label={t('metric.implementation')}
              value={form.implementationId || ''}
              options={[['', 'metric.useDefaultImplementation']].concat(availableImplementations.map((item) => [item.id, item.implementationName]))}
              onChange={(implementationId) => {
                const implementation = availableImplementations.find((item) => item.id === implementationId);
                const executionMode = implementation?.executionMode || form.executionMode || 'SERVER';
                setForm({ ...form, implementationId, executionMode, executorNodeId: executionMode === 'SERVER' || executionMode === 'EXPRESSION' ? '' : form.executorNodeId });
              }}
            />
            <FieldSelect
              label={t('metric.executionMode')}
              value={form.executionMode || 'SERVER'}
              options={EXECUTION_OPTIONS}
              onChange={(executionMode) => setForm({ ...form, executionMode, executorNodeId: executionMode === 'SERVER' || executionMode === 'EXPRESSION' ? '' : form.executorNodeId })}
            />
            {needExecutorNode ? (
              <FieldSelect
                label={t('collectionTask.executorNode')}
                value={form.executorNodeId || ''}
                options={availableExecutorNodes.map((item) => [item.id, executorNodeOptionLabel(item)])}
                onChange={(executorNodeId) => setForm({ ...form, executorNodeId })}
              />
            ) : null}
            <Field
              label={t('metric.interval')}
              type="number"
              value={form.intervalSec || 60}
              onChange={(intervalSec) => setForm({ ...form, intervalSec: Number(intervalSec) })}
            />
            <FieldSelect
              label={t('metric.status')}
              value={String(form.enabled !== false)}
              options={[['true', 'metric.enabled'], ['false', 'metric.disabled']]}
              onChange={(enabled) => setForm({ ...form, enabled: enabled === 'true' })}
            />
            <Field label={t('description')} value={form.description || ''} onChange={(description) => setForm({ ...form, description })} />
            <label className="fp-field fp-field--wide">
              <span>{t('metric.parameterJson')}</span>
              <textarea
                value={form.parameterJson || ''}
                onChange={(event) => setForm({ ...form, parameterJson: event.target.value })}
                placeholder={selectedMetric ? t('infrastructure.metricParameterHint') : t('selectPlaceholder')}
              />
              <em>{t('infrastructure.metricParameterDesc')}</em>
            </label>
          </FormGroup>
        </main>
        </div>
    </section>
  );
}

function InfrastructureThresholdConfigPage({ detail, env, region, configPage, onBack, onSubmit, message, onClearMessage }) {
  const { metric, config, rule } = configPage;
  const [form, setForm] = useState(() => defaultQuickThresholdForm(detail, metric, rule));
  const currentValue = config && config.currentValue !== undefined && config.currentValue !== null
    ? formatMetricValue(config.currentValue, metric.valuePrecision)
    : t('infrastructure.noMetricValue');

  function updateCondition(severity, patch) {
    setForm((current) => ({
      ...current,
      conditions: current.conditions.map((item) => (item.severity === severity ? { ...item, ...patch } : item)),
    }));
  }

  return (
    <section className="fp-page fp-infra-config-page">
      <button className="fp-link-button fp-back-link fp-infra-back" type="button" onClick={onBack}>
        {t('infrastructure.backToDetail')}
      </button>
      <Toast message={message} onClose={onClearMessage} />
      <div className="fp-infra-config-shell fp-threshold-config-shell">
        <aside className="fp-infra-config-aside">
          <span className="fp-kicker">{t('infrastructure.threshold')}</span>
          <h1>{rule ? t('infrastructure.editThreshold') : t('infrastructure.configureThreshold')}</h1>
          <p>{t('threshold.quickPageDesc')}</p>
          <div className="fp-infra-config-preview">
            <span className={`fp-type-tag fp-type-tag--${detail.type.toLowerCase()}`}>{detail.type}</span>
            <strong>{detail.name}</strong>
            <em>{detail.code}</em>
            <small>{env?.envName || '-'} / {region?.regionName || '-'}</small>
          </div>
          <div className="fp-infra-metric-preview">
            <span>{t('metric.name')}</span>
            <strong>{metric.metricName}</strong>
            <em>{metric.metricCode}</em>
            <small>{t('infrastructure.currentMetricValue')}: {currentValue}{metric.valueUnit ? ` ${metric.valueUnit}` : ''}</small>
          </div>
          <div className="fp-actions fp-actions--stack">
            <button className="fp-button fp-button--primary" type="button" onClick={() => onSubmit(form)}>{t('save')}</button>
            <button className="fp-button" type="button" onClick={onBack}>{t('cancel')}</button>
          </div>
        </aside>

        <main className="fp-infra-config-main">
          <FormGroup title={t('threshold.quickScope')} desc={t('threshold.quickScopeDesc')}>
            <Info label={t('metric.name')} value={`${metric.metricName} / ${metric.metricCode}`} />
            <Info label={t('infrastructure.name')} value={detail.name} />
            <Info label={t('infrastructure.code')} value={detail.code} />
            <Info label={t('infrastructure.currentMetricValue')} value={`${currentValue}${metric.valueUnit ? ` ${metric.valueUnit}` : ''}`} />
          </FormGroup>
          <FormGroup title={t('threshold.quickRules')} desc={t('threshold.quickRulesDesc')}>
            <div className="fp-threshold-step-table">
              <div className="fp-threshold-step-row fp-threshold-step-row--head">
                <span>{t('threshold.severity')}</span>
                <span>{t('status')}</span>
                <span>{t('threshold.operator')}</span>
                <span>{t('threshold.value')}</span>
              </div>
              {form.conditions.map((condition) => (
                <div className={`fp-threshold-step-row ${condition.enabled ? 'is-enabled' : ''}`} key={condition.severity}>
                  <strong>{t(severityLabel(condition.severity))}</strong>
                  <label className="fp-switch-line">
                    <input type="checkbox" checked={condition.enabled} onChange={(event) => updateCondition(condition.severity, { enabled: event.target.checked })} />
                    <span>{condition.enabled ? t('enabled') : t('disabled')}</span>
                  </label>
                  <select value={condition.operator} onChange={(event) => updateCondition(condition.severity, { operator: event.target.value })} disabled={!condition.enabled}>
                    <option value=">">&gt;</option>
                    <option value=">=">&gt;=</option>
                    <option value="<">&lt;</option>
                    <option value="<=">&lt;=</option>
                    <option value="==">=</option>
                    <option value="!=">!=</option>
                  </select>
                  <input
                    type="number"
                    value={condition.value}
                    disabled={!condition.enabled}
                    onChange={(event) => updateCondition(condition.severity, { value: event.target.value })}
                    placeholder={t('threshold.valuePlaceholder')}
                  />
                </div>
              ))}
            </div>
          </FormGroup>
          <FormGroup title={t('threshold.judgementPolicy')} desc={t('threshold.judgementPolicyDesc')}>
            <Field label={t('threshold.ruleName')} value={form.ruleName} onChange={(ruleName) => setForm({ ...form, ruleName })} />
            <Field label={t('threshold.evaluationWindow')} type="number" value={form.evaluationWindowSec} onChange={(evaluationWindowSec) => setForm({ ...form, evaluationWindowSec: Number(evaluationWindowSec) })} hint={t('threshold.evaluationWindowHint')} />
            <Field label={t('threshold.consecutiveCount')} type="number" value={form.consecutiveCount} onChange={(consecutiveCount) => setForm({ ...form, consecutiveCount: Number(consecutiveCount) })} />
            <FieldSelect label={t('threshold.recoveryPolicy')} value={form.recoveryPolicy} options={[['AUTO', 'threshold.recoveryAuto'], ['MANUAL', 'threshold.recoveryManual']]} onChange={(recoveryPolicy) => setForm({ ...form, recoveryPolicy })} />
            <FieldSelect label={t('metric.status')} value={String(form.enabled)} options={[['true', 'metric.enabled'], ['false', 'metric.disabled']]} onChange={(enabled) => setForm({ ...form, enabled: enabled === 'true' })} />
            <Field label={t('description')} value={form.description || ''} onChange={(description) => setForm({ ...form, description })} />
          </FormGroup>
        </main>
      </div>
    </section>
  );
}

function InfrastructureMetricBoard({ detail, metrics, configs, thresholds, alerts, executorNodes, instanceEnabled, onAdd, onEdit, onThreshold }) {
  const [keyword, setKeyword] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [expandedId, setExpandedId] = useState('');
  const objectConfigs = configs.filter((config) => !detail || (config.objectType === detail.type && config.objectId === detail.id));
  const rows = buildMetricRows(metrics, objectConfigs, thresholds);
  const executorIndex = useMemo(() => indexById(executorNodes || []), [executorNodes]);
  const alertsByMetric = useMemo(() => groupAlertsByMetric(alerts || []), [alerts]);
  const enabledCount = rows.filter((row) => row.config && row.config.enabled !== false).length;
  const visibleRows = rows.filter((row) => {
    const matchesKeyword = !keyword || `${row.metric.metricName} ${row.metric.metricCode}`.toLowerCase().includes(keyword.trim().toLowerCase());
    const matchesStatus = statusFilter === 'ALL'
      || (statusFilter === 'CONFIGURED' && row.config)
      || (statusFilter === 'UNCONFIGURED' && !row.config)
      || (statusFilter === 'ALERT' && alertsByMetric[row.metric.id]);
    return matchesKeyword && matchesStatus;
  });

  return (
    <section className="fp-card fp-infra-metric-board fp-infra-work-card">
      <div className="fp-infra-metric-board__head">
        <div>
          <h2>采集指标 <strong className="fp-infra-metric-board__count">{rows.length}</strong></h2>
          <p>{t('infrastructure.metricConfigDesc')}</p>
        </div>
      </div>

      {!instanceEnabled && enabledCount > 0 ? (
        <div className="fp-infra-paused-notice">实例当前已停用，以下指标保留启用配置，但不会按实例计划继续采集。</div>
      ) : null}

      <div className="fp-infra-metric-toolbar">
        <label className="fp-inline-search">
          <SearchOutlined />
          <input value={keyword} placeholder="搜索指标名称或编码" onChange={(event) => setKeyword(event.target.value)} />
        </label>
        <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
          <option value="ALL">全部指标</option>
          <option value="CONFIGURED">已配置采集</option>
          <option value="UNCONFIGURED">未配置采集</option>
          <option value="ALERT">告警中</option>
        </select>
      </div>

      {visibleRows.length === 0 ? (
        <div className="fp-empty">{t('infrastructure.noMetricDefinition')}</div>
      ) : (
        <div className="fp-infra-metric-table">
          <div className="fp-infra-metric-table__head">
            <span>指标名称</span><span>当前值</span><span>采集配置</span><span>采集状态</span><span>采集周期</span><span>阈值配置</span><span>告警状态</span><span />
          </div>
          {visibleRows.map((row) => (
            <InfrastructureMetricTableRow
              key={row.metric.id}
              row={row}
              alert={alertsByMetric[row.metric.id]}
              executorIndex={executorIndex}
              instanceEnabled={instanceEnabled}
              expanded={expandedId === row.metric.id}
              onToggle={() => setExpandedId((current) => current === row.metric.id ? '' : row.metric.id)}
              onAdd={onAdd}
              onEdit={onEdit}
              onThreshold={onThreshold}
            />
          ))}
        </div>
      )}
    </section>
  );
}

function InfrastructureRuntimeOverview({ detail, metrics, configs, thresholds, alerts, connectionStatus }) {
  const objectConfigs = configs.filter((config) => config.objectType === detail.type && config.objectId === detail.id);
  const configuredIds = new Set(objectConfigs.map((config) => config.metricDefinitionId));
  const thresholdCount = thresholds.filter((rule) => configuredIds.has(rule.metricDefinitionId)).length;
  const abnormalCount = objectConfigs.filter((config) => config.lastCollectStatus === 'ERROR').length;
  const items = [
    ['实例状态', detail.runStatus === 'ENABLED' ? '已启用' : '已停用', detail.runStatus === 'ENABLED' ? 'success' : 'muted'],
    ['连接状态', connectionStatus === 'NORMAL' ? '正常' : connectionStatus === 'ERROR' ? '异常' : '未测试', connectionStatus === 'NORMAL' ? 'success' : connectionStatus === 'ERROR' ? 'danger' : 'muted'],
    ['可配置指标', metrics.length, ''],
    ['已配置采集', objectConfigs.length, ''],
    ['已配置阈值', thresholdCount, ''],
    ['采集异常', abnormalCount, abnormalCount ? 'danger' : ''],
    ['告警中', alerts.length, alerts.length ? 'warning' : ''],
  ];
  return (
    <section className="fp-card fp-infra-runtime-overview">
      <h2>运行概览</h2>
      <div>
        {items.map(([label, value, tone]) => <span className={tone ? `is-${tone}` : ''} key={label}><em>{label}</em><strong>{value}</strong></span>)}
      </div>
    </section>
  );
}

function InfrastructureMetricTableRow({ row, alert, executorIndex, instanceEnabled, expanded, onToggle, onAdd, onEdit, onThreshold }) {
  const { metric, config, thresholds } = row;
  const enabled = Boolean(config && config.enabled !== false);
  const hasAlert = Boolean(alert && alert.status === 'ACTIVE' && alert.currentLevel !== 'NORMAL');
  const collectError = Boolean(config && config.lastCollectStatus === 'ERROR');
  const executorNode = config?.executorNodeId ? executorIndex[config.executorNodeId] : null;
  const currentValue = config?.currentValue !== undefined && config?.currentValue !== null ? `${formatMetricValue(config.currentValue, metric.valuePrecision)}${metric.valueUnit ? ` ${metric.valueUnit}` : ''}` : '—';
  const collectStatus = !config ? '未配置' : !instanceEnabled ? '已暂停' : labelCollect(config.lastCollectStatus);
  return (
    <article className={`fp-infra-metric-row ${expanded ? 'is-expanded' : ''}`}>
      <button className="fp-infra-metric-row__main" type="button" onClick={onToggle}>
        <span className="fp-infra-metric-row__name"><strong>{metric.metricName}</strong><em>{metric.metricCode}</em></span>
        <strong>{currentValue}</strong>
        <span className={config ? 'is-link' : 'is-muted'}>{config ? '已配置' : '未配置'}</span>
        <span className={collectError ? 'is-danger' : ''}>● {collectStatus}</span>
        <span>{config ? `${config.intervalSec || '-'}s` : '—'}</span>
        <span className={thresholds.length ? 'is-link' : 'is-muted'}>{thresholds.length ? '已配置' : '未配置'}</span>
        <span className={hasAlert ? `is-${alert.currentLevel?.toLowerCase()}` : 'is-success'}>● {hasAlert ? levelText(alert.currentLevel) : '正常'}</span>
        <span className="fp-infra-metric-row__chevron">⌄</span>
      </button>
      {expanded ? (
        <div className="fp-infra-metric-row__detail">
          <span><em>最近采集</em><strong>{config ? formatTime(config.currentValueAt || config.lastCollectAt) : '尚未采集'}</strong></span>
          <span><em>执行方式</em><strong>{config ? labelExecution(config.executionMode) : '开启后配置'}</strong></span>
          <span><em>当前告警</em><strong>{hasAlert ? formatAlertMessage(alert) : '无活动告警'}</strong></span>
          <span><em>最近消息</em><strong>{config?.lastCollectMessage || '暂无采集消息'}</strong></span>
          {config?.executionMode === 'SSH' ? <span><em>执行节点</em><strong>{executorNode?.host || '未找到节点'}</strong></span> : null}
          <div className="fp-actions">
            <button className="fp-button fp-button--small" type="button" onClick={() => config ? onEdit(config) : onAdd(metric)}>{config ? '配置采集' : '开启指标'}</button>
            <button className="fp-button fp-button--small" type="button" onClick={() => onThreshold(row)}>{thresholds.length ? '编辑阈值' : '配置阈值'}</button>
          </div>
        </div>
      ) : null}
    </article>
  );
}

function InfrastructureMetricCard({ row, alert, executorIndex, instanceEnabled, onAdd, onEdit, onThreshold }) {
  const { metric, config, thresholds } = row;
  const enabled = Boolean(config && config.enabled !== false);
  const collectError = Boolean(config && config.lastCollectStatus === 'ERROR');
  const hasAlert = Boolean(alert && alert.status === 'ACTIVE' && alert.currentLevel !== 'NORMAL');
  const thresholdText = thresholds.length ? summarizeThreshold(thresholds[0]) : (hasAlert ? '当前告警未关联到可见阈值规则' : t('infrastructure.thresholdNotConfigured'));
  const collectStatus = config ? (instanceEnabled ? labelCollect(config.lastCollectStatus) : '实例停用，采集已暂停') : t('infrastructure.metricNotEnabled');
  const executorNode = config && config.executorNodeId ? executorIndex[config.executorNodeId] : null;
  const executorText = config && config.executionMode === 'SSH'
    ? (executorNode ? executorNode.host : t('metric.executorNodeMissing'))
    : '-';
  const valueUnit = metric.valueUnit || '';
  const currentValue = config && config.currentValue !== undefined && config.currentValue !== null
    ? formatMetricValue(config.currentValue, metric.valuePrecision)
    : t('infrastructure.noMetricValue');

  return (
    <article className={`fp-infra-metric-tile ${enabled ? 'is-enabled' : 'is-disabled'} ${collectError ? 'is-error' : ''} ${hasAlert ? `is-alert is-${alert.currentLevel}` : ''}`}>
      <div className="fp-infra-metric-tile__top">
        <div>
          <h3>{metric.metricName}</h3>
          <em>{metric.metricCode}</em>
        </div>
        <div className="fp-infra-metric-badges">
          {hasAlert ? <span className={`fp-infra-metric-state is-alert is-${alert.currentLevel}`}>{levelText(alert.currentLevel)}</span> : null}
          {collectError ? <span className="fp-infra-metric-state is-error">{t('metric.collectError')}</span> : null}
          {config ? <span className={`fp-infra-metric-state ${enabled && instanceEnabled ? 'is-on' : ''}`}>{enabled ? (instanceEnabled ? t('metric.enabled') : '已配置 · 暂停') : t('metric.disabled')}</span> : null}
        </div>
      </div>

      {config ? (
        <>
          <div className="fp-infra-metric-value">
            <span>{t('infrastructure.currentMetricValue')}</span>
            <strong>{currentValue} {valueUnit ? <em>{valueUnit}</em> : null}</strong>
          </div>

          <div className="fp-infra-metric-facts">
            <MetricFact label={t('collectionTask.lastCollectAt')} value={formatTime(config.currentValueAt || config.lastCollectAt)} />
            <MetricFact label={t('metric.collectStatus')} value={collectStatus} tone={collectError ? 'danger' : ''} />
            {hasAlert ? <MetricFact label={t('infrastructure.activeAlert')} value={formatAlertMessage(alert)} tone="danger" wide /> : null}
            <MetricFact label={t('collectionTask.lastMessage')} value={config.lastCollectMessage || '暂无采集消息'} tone={collectError ? 'danger' : ''} wide={collectError} />
            <MetricFact label={t('metric.implementation')} value={config.implementationName || t('metric.useDefaultImplementation')} />
            <MetricFact label={t('metric.executionMode')} value={labelExecution(config.executionMode)} />
            {config.executionMode === 'SSH' ? <MetricFact label={t('collectionTask.executorNode')} value={executorText} tone={!executorNode ? 'danger' : ''} /> : null}
            <MetricFact label={t('metric.interval')} value={`${config.intervalSec || '-'}s`} />
            <MetricFact label={t('infrastructure.threshold')} value={thresholdText} important={thresholds.length > 0} wide />
          </div>
        </>
      ) : (
        <div className="fp-infra-metric-empty">
          <span className="fp-infra-metric-empty__icon">＋</span>
          <div>
            <strong>指标尚未开启</strong>
            <p>开启后将按配置周期采集指标值，并可关联阈值规则与告警。</p>
          </div>
        </div>
      )}

      <div className="fp-infra-metric-actions">
        {config ? (
          <button className="fp-button fp-button--small" type="button" onClick={() => onEdit(config)}>{t('infrastructure.configureCollect')}</button>
        ) : (
          <button className="fp-button fp-button--primary fp-button--small" type="button" onClick={() => onAdd(metric)}>{t('infrastructure.enableMetric')}</button>
        )}
        <button className="fp-button fp-button--small" type="button" onClick={() => onThreshold(row)}>{thresholds.length ? t('infrastructure.editThreshold') : t('infrastructure.configureThreshold')}</button>
      </div>
    </article>
  );
}

function MetricFact({ label, value, important = false, tone = '', wide = false }) {
  return (
    <div className={`${important ? 'is-important' : ''} ${tone ? `is-${tone}` : ''} ${wide ? 'is-wide' : ''}`}>
      <span>{label}</span>
      <strong title={String(value || '-')}>{value || '-'}</strong>
    </div>
  );
}

function ConfigBlock({ title, children }) {
  return (
    <section className="fp-infra-config-block">
      <h2>{title}</h2>
      <div className="fp-info-grid">{children}</div>
    </section>
  );
}

function FormGroup({ title, desc, children }) {
  return (
    <section className="fp-infra-form-group">
      <div className="fp-infra-form-group__head">
        <h2>{title}</h2>
        {desc ? <p>{desc}</p> : null}
      </div>
      <div className="fp-form fp-form--page fp-infra-form-grid">{children}</div>
    </section>
  );
}

function StatusPill({ status }) {
  const key = status === 'NORMAL' ? 'infrastructure.statusNormal' : (status === 'ERROR' ? 'infrastructure.statusError' : 'infrastructure.statusUnknown');
  return <span className={`fp-status-pill fp-status-pill--${(status || 'UNKNOWN').toLowerCase()}`}>{t(key)}</span>;
}

function ResourceStatus({ status }) {
  const normalized = String(status || '').toUpperCase();
  const normal = ['OPEN', 'NORMAL', 'ACTIVE', 'RUNNING'].includes(normalized);
  const label = normal ? '正常' : (normalized === 'CLOSED' ? '已关闭' : (status || '未知'));
  return <span className={`fp-resource-status ${normal ? 'is-normal' : ''}`}>{label}</span>;
}

function effectiveConnectionStatus(detail) {
  const message = String(detail.lastTestMessage || '').toLowerCase();
  if (detail.lastTestAt && /(passed|success|connected|成功|正常)/.test(message)) {
    return 'NORMAL';
  }
  if (detail.lastTestAt && /(failed|error|exception|timeout|失败|异常|超时)/.test(message)) {
    return 'ERROR';
  }
  return detail.connectionStatus || 'UNKNOWN';
}

function connectionTestSummary(message) {
  const raw = normalizeActionMessage(message);
  if (!raw) {
    return '-';
  }
  if (/(passed|success|connected|成功)/i.test(raw)) {
    const clusterStatus = raw.match(/["']status["']\s*:\s*["']([^"']+)["']/i);
    return clusterStatus ? `连接成功 · 集群状态 ${clusterStatus[1]}` : '连接成功';
  }
  if (/(timeout|超时)/i.test(raw)) {
    return '连接超时';
  }
  if (/(failed|error|exception|失败|异常)/i.test(raw)) {
    return '连接失败，请查看详情';
  }
  return raw;
}

function formatAlertMessage(alert) {
  const raw = String(alert.message || '');
  const thresholdMatch = raw.match(/value\s+(-?[\d.]+)\s*(>=|<=|>|<|==)\s*(-?[\d.]+)/i);
  if (!thresholdMatch) {
    return raw || levelText(alert.currentLevel);
  }
  const operatorText = { '>': '超过', '>=': '达到或超过', '<': '低于', '<=': '达到或低于', '==': '等于' }[thresholdMatch[2]];
  return `当前值 ${thresholdMatch[1]}，${operatorText}${levelText(alert.currentLevel)}阈值 ${thresholdMatch[3]}`;
}

function DetailSection({ title, children }) {
  return (
    <section className="fp-detail-section">
      <h2>{title}</h2>
      <div className="fp-info-grid">{children}</div>
    </section>
  );
}

function Info({ label, value, action = null }) {
  return (
    <div className="fp-info-box">
      <span>{label}</span>
      <strong>
        <span>{value || '-'}</span>
        {action}
      </strong>
    </div>
  );
}

function CopyButton({ value, onCopy }) {
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    if (!copied) {
      return undefined;
    }
    const timer = window.setTimeout(() => setCopied(false), 1600);
    return () => window.clearTimeout(timer);
  }, [copied]);
  return (
    <button className="fp-copy-button" type="button" onClick={(event) => {
      event.stopPropagation();
      Promise.resolve(onCopy(value)).then((success) => setCopied(Boolean(success)));
    }}>
      {copied ? t('copied') : t('copy')}
    </button>
  );
}

function EnvironmentTree({ environments, regions, selectedEnvId, selectedRegionId, onSelect }) {
  return (
    <aside className="fp-infra-tree">
      <div className="fp-infra-tree__title">{t('infrastructure.scopeTree')}</div>
      <button className={!selectedEnvId && !selectedRegionId ? 'is-active' : ''} type="button" onClick={() => onSelect('', '')}>
        {t('infrastructure.allScope')}
      </button>
      {environments.map((env) => {
        const managers = regions.filter((region) => region.envId === env.id && region.regionType === 'MANAGEMENT');
        return (
          <div className="fp-tree-group" key={env.id}>
            <button className={selectedEnvId === env.id && !selectedRegionId ? 'is-active' : ''} type="button" onClick={() => onSelect(env.id, '')}>
              <span>{env.envName}</span>
              <em>{env.envCode}</em>
            </button>
            {managers.map((manager) => {
              const computes = regions.filter((region) => region.parentRegionId === manager.id);
              return (
                <div className="fp-tree-children" key={manager.id}>
                  <button className={`fp-tree-management ${selectedRegionId === manager.id ? 'is-active' : ''}`} type="button" onClick={() => onSelect(env.id, manager.id)}>
                    <span>{manager.regionName}</span>
                    <em>{t('managementRegion')}</em>
                  </button>
                  <div className="fp-tree-computes">
                    {computes.map((compute) => (
                      <button className={`fp-tree-compute ${selectedRegionId === compute.id ? 'is-active' : ''}`} key={compute.id} type="button" onClick={() => onSelect(env.id, compute.id)}>
                        <span>{compute.regionName}</span>
                        <em>{t('computeRegion')}</em>
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        );
      })}
    </aside>
  );
}

function Field({ label, value, onChange, type = 'text', hint = '', disabled = false, autoComplete = 'off', wide = false }) {
  return (
    <label className={`fp-field ${wide ? 'fp-field--wide' : ''}`}>
      <span>{label}</span>
      <input
        type={type}
        value={value || ''}
        onChange={(event) => onChange(event.target.value)}
        autoComplete={autoComplete}
        disabled={disabled}
        name={`fp-${label}-${type}`}
        readOnly={disabled}
      />
      {hint ? <em>{hint}</em> : null}
    </label>
  );
}

function FieldSelect({ label, value, options, onChange, disabled = false }) {
  return (
    <div className="fp-field">
      <span>{label}</span>
      <CustomSelect value={value || ''} options={[['', 'selectPlaceholder']].concat(options)} onChange={onChange} disabled={disabled} />
    </div>
  );
}

function SelectBare({ value, options, onChange }) {
  return <CustomSelect className="fp-select-bare" value={value || ''} options={options} onChange={onChange} />;
}

function CustomSelect({ value, options, onChange, className = '', disabled = false }) {
  const [open, setOpen] = useState(false);
  const current = options.find(([optionValue]) => optionValue === value) || options[0];
  return (
    <div className={`fp-select-custom ${className} ${disabled ? 'is-disabled' : ''}`} tabIndex={disabled ? -1 : 0} onBlur={() => setOpen(false)}>
      <button className="fp-select-custom__trigger" type="button" disabled={disabled} onClick={() => !disabled && setOpen(!open)}>
        <span>{renderOptionLabel(current && current[1])}</span>
        <i />
      </button>
      {open ? (
        <div className="fp-select-custom__menu">
          {options.map(([optionValue, label]) => (
            <button
              className={optionValue === value ? 'is-active' : ''}
              key={optionValue}
              type="button"
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => {
                onChange(optionValue);
                setOpen(false);
              }}
            >
              {renderOptionLabel(label)}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function indexById(records) {
  const index = {};
  records.forEach((record) => {
    index[record.id] = record;
  });
  return index;
}

function formatTime(value) {
  if (!value) {
    return '-';
  }
  return new Date(value).toLocaleString();
}

function formatMetricValue(value, precision = 2) {
  const number = Number(value);
  if (!Number.isFinite(number)) {
    return '-';
  }
  const digits = Number.isInteger(Number(precision)) ? Number(precision) : 2;
  return number.toFixed(Math.max(0, Math.min(digits, 8))).replace(/\.?0+$/, '');
}

function endpointHint(type) {
  if (type === 'KAFKA') {
    return t('infrastructure.kafkaEndpointHint');
  }
  if (type === 'SPARK') {
    return t('infrastructure.sparkEndpointHint');
  }
  if (type === 'ELASTICSEARCH') {
    return t('infrastructure.esEndpointHint');
  }
  return '';
}

function connectionEndpointLabel(type) {
  if (type === 'KAFKA') {
    return t('infrastructure.kafkaBootstrapServers');
  }
  if (type === 'SPARK') {
    return t('infrastructure.sparkMasterWebUi');
  }
  if (type === 'ELASTICSEARCH') {
    return t('infrastructure.esHttpEndpoint');
  }
  return t('infrastructure.endpoint');
}

function infrastructureTypeLabel(type) {
  const option = TYPE_OPTIONS.find(([value]) => value === type);
  return option ? option[1] : (type || '-');
}

function infrastructureTypeInitials(type) {
  const initials = {
    KAFKA: 'KF',
    SPARK: 'SP',
    ELASTICSEARCH: 'ES',
  };
  return initials[type] || String(type || '--').slice(0, 2).toUpperCase();
}

function scopeLabel(query, envIndex, regionIndex) {
  if (query.regionId) {
    const region = regionIndex[query.regionId];
    const env = region ? envIndex[region.envId] : null;
    return `${env ? env.envName : '-'} / ${region ? region.regionName : '-'}`;
  }
  if (query.envId) {
    const env = envIndex[query.envId];
    return env ? env.envName : t('infrastructure.allScope');
  }
  return t('infrastructure.allScope');
}

function renderOptionLabel(label) {
  return label && label.indexOf('.') > 0 ? t(label) : t(label);
}

function normalizeActionMessage(message) {
  if (message && message.indexOf('KAFKA_ZOOKEEPER_ENDPOINT') >= 0) {
    return t('infrastructure.kafkaZookeeperEndpoint');
  }
  return message || '';
}

function actionMessage(action, item, result) {
  const success = result && (result.status === 'NORMAL' || result.status === 'SUCCESS');
  const reason = normalizeActionMessage(result && result.message);
  if (action === 'test') {
    return success
      ? t('infrastructure.testPassed', item.name)
      : t('infrastructure.testFailed', item.name, conciseReason(reason));
  }
  return success
    ? t('infrastructure.syncSucceeded', item.name, parseSyncCount(reason))
    : t('infrastructure.syncFailed', item.name, conciseReason(reason));
}

function parseSyncCount(message) {
  const match = String(message || '').match(/count=(\d+)/);
  return match ? match[1] : '-';
}

function conciseReason(message) {
  const text = String(message || '').trim();
  if (!text) {
    return t('infrastructure.unknownReason');
  }
  if (text.length <= 120) {
    return text;
  }
  return `${text.substring(0, 120)}...`;
}

function normalizeFormByAuth(form) {
  const authType = form.authType || 'NONE';
  if (authType === 'NONE') {
    return { ...form, authType, username: '', password: '', apiKey: '' };
  }
  if (authType === 'BASIC') {
    return { ...form, authType, apiKey: '' };
  }
  if (authType === 'API_KEY') {
    return { ...form, authType, username: '', password: '' };
  }
  return form;
}

function defaultInfrastructureMetricConfig(infrastructure, metric = null) {
  return {
    objectType: infrastructure.type,
    objectId: infrastructure.id,
    objectCode: infrastructure.code,
    objectName: infrastructure.name,
    metricDefinitionId: metric ? metric.id : '',
    implementationId: '',
    executionMode: 'SERVER',
    intervalSec: 60,
    parameterJson: '',
    enabled: true,
    description: '',
    executorNodeId: '',
  };
}

function defaultQuickThresholdForm(infrastructure, metric, rule = null) {
  const parsedConditions = parseThresholdConditions(rule && rule.conditionsJson);
  const conditionIndex = {};
  parsedConditions.forEach((condition) => {
    conditionIndex[condition.severity] = condition;
  });
  return {
    id: rule ? rule.id : '',
    ruleCode: rule ? rule.ruleCode : `thr_${infrastructure.code}_${metric.metricCode}`.replace(/[^a-zA-Z0-9_]/g, '_').toLowerCase(),
    ruleName: rule ? rule.ruleName : `${infrastructure.name} - ${metric.metricName}`,
    metricDefinitionId: metric.id,
    evaluationWindowSec: rule ? rule.evaluationWindowSec : 60,
    consecutiveCount: rule ? rule.consecutiveCount : 1,
    recoveryPolicy: rule ? rule.recoveryPolicy || 'AUTO' : 'AUTO',
    enabled: rule ? rule.enabled !== false : true,
    description: rule ? rule.description || '' : '',
    conditions: QUICK_THRESHOLD_SEVERITIES.map(([severity]) => {
      const condition = conditionIndex[severity] || {};
      return {
        severity,
        enabled: Boolean(conditionIndex[severity]),
        operator: condition.operator || '>=',
        value: condition.value !== undefined && condition.value !== null ? String(condition.value) : '',
      };
    }),
  };
}

function normalizeQuickThreshold(form, infrastructure, metric) {
  const conditions = form.conditions
    .filter((condition) => condition.enabled && condition.value !== '')
    .map((condition) => ({
      severity: condition.severity,
      operator: condition.operator || '>=',
      value: Number(condition.value),
    }))
    .filter((condition) => Number.isFinite(condition.value));
  return {
    ruleCode: form.ruleCode,
    ruleName: form.ruleName,
    metricDefinitionId: metric.id,
    scopeType: 'RESOURCE',
    objectType: infrastructure.type,
    objectId: infrastructure.id,
    objectCode: infrastructure.code,
    objectName: infrastructure.name,
    topologyId: '',
    topologyElementId: '',
    topologyElementType: '',
    conditionsJson: conditions.length ? JSON.stringify(conditions) : '',
    evaluationWindowSec: Number(form.evaluationWindowSec) || 60,
    consecutiveCount: Number(form.consecutiveCount) || 1,
    recoveryPolicy: form.recoveryPolicy || 'AUTO',
    enabled: form.enabled !== false,
    description: form.description || '',
  };
}

function severityLabel(severity) {
  const labels = {
    REMIND: 'threshold.severity.remind',
    WARNING: 'threshold.severity.warning',
    ERROR: 'threshold.severity.error',
    CRITICAL: 'threshold.severity.critical',
    URGENT: 'threshold.severity.urgent',
  };
  return labels[severity] || severity;
}

function normalizeInfrastructureMetricConfig(form, infrastructure) {
  return {
    objectType: infrastructure.type,
    objectId: infrastructure.id,
    objectCode: infrastructure.code,
    objectName: infrastructure.name,
    metricDefinitionId: form.metricDefinitionId,
    implementationId: form.implementationId || '',
    executionMode: form.executionMode || 'SERVER',
    executorNodeId: form.executorNodeId || '',
    intervalSec: Number(form.intervalSec || 60),
    parameterJson: form.parameterJson || '',
    enabled: form.enabled !== false,
    description: form.description || '',
  };
}

function filterInfrastructureMetrics(metrics, infrastructureType) {
  return metrics.filter((item) => {
    if (item.enabled === false) {
      return false;
    }
    if (item.objectType === infrastructureType) {
      return true;
    }
    return item.metricCategory === 'INFRASTRUCTURE' && (!item.objectType || item.objectType === infrastructureType);
  });
}

function filterExecutorNodes(nodes, infrastructure, executionMode) {
  if (executionMode !== 'SSH' && executionMode !== 'AGENT') {
    return [];
  }
  return nodes.filter((node) => {
    if (node.envId !== infrastructure.envId || node.regionId !== infrastructure.regionId) {
      return false;
    }
    return executionMode === 'SSH' ? node.sshSupported === true : node.agentSupported === true;
  });
}

function executorNodeOptionLabel(node) {
  const status = node.connectionStatus ? ` / ${labelStatus(node.connectionStatus)}` : '';
  return `${node.host}${status}`;
}

function labelStatus(status) {
  if (status === 'NORMAL') {
    return t('infrastructure.statusNormal');
  }
  if (status === 'ERROR') {
    return t('infrastructure.statusError');
  }
  return t('infrastructure.statusUnknown');
}

function buildMetricRows(metrics, configs, thresholds) {
  const configByMetric = {};
  configs.forEach((config) => {
    configByMetric[config.metricDefinitionId] = config;
  });
  const thresholdsByMetric = {};
  thresholds.forEach((rule) => {
    if (!thresholdsByMetric[rule.metricDefinitionId]) {
      thresholdsByMetric[rule.metricDefinitionId] = [];
    }
    thresholdsByMetric[rule.metricDefinitionId].push(rule);
  });
  return metrics.map((metric) => ({
    metric,
    config: configByMetric[metric.id] || null,
    thresholds: thresholdsByMetric[metric.id] || [],
  }));
}

function summarizeThreshold(rule) {
  if (!rule) {
    return '-';
  }
  const conditions = parseThresholdConditions(rule.conditionsJson);
  if (!conditions.length) {
    return rule.enabled === false ? t('infrastructure.thresholdDisabled') : t('infrastructure.thresholdConfigured');
  }
  const text = conditions
    .slice(0, 3)
    .map((item) => `${severityText(item.severity)} ${item.operator || ''} ${item.value ?? '-'}`)
    .join(' / ');
  return rule.enabled === false ? `${text} (${t('metric.disabled')})` : text;
}

function parseThresholdConditions(value) {
  try {
    const parsed = JSON.parse(value || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    return [];
  }
}

function severityText(value) {
  const map = {
    NORMAL: t('metric.collectNormal'),
    REMIND: t('threshold.severity.remind'),
    WARNING: t('threshold.severity.warning'),
    ERROR: t('threshold.severity.error'),
    CRITICAL: t('threshold.severity.critical'),
    URGENT: t('threshold.severity.urgent'),
    UNKNOWN: t('metric.collectUnknown'),
  };
  return map[value] || value || '-';
}

function levelText(value) {
  return severityText(value);
}

function labelExecution(value) {
  return value || '-';
}

function labelCollect(value) {
  if (value === 'NORMAL' || value === 'SUCCESS') return t('metric.collectNormal');
  if (value === 'ERROR') return t('metric.collectError');
  return t('metric.collectUnknown');
}

function groupAlertsByMetric(alerts) {
  const grouped = {};
  alerts.forEach((alert) => {
    const current = grouped[alert.metricDefinitionId];
    if (!current || levelRank(alert.currentLevel) > levelRank(current.currentLevel)) {
      grouped[alert.metricDefinitionId] = alert;
    }
  });
  return grouped;
}

function groupAlertsByObject(alerts) {
  const grouped = {};
  (alerts || []).forEach((alert) => {
    const current = grouped[alert.objectId];
    if (!current || levelRank(alert.currentLevel) > levelRank(current.currentLevel)) {
      grouped[alert.objectId] = alert;
    }
  });
  return grouped;
}

function highestActiveAlert(alerts) {
  return (alerts || []).reduce((highest, alert) => {
    if (!highest || levelRank(alert.currentLevel) > levelRank(highest.currentLevel)) {
      return alert;
    }
    return highest;
  }, null);
}

function levelRank(level) {
  const ranks = {
    NORMAL: 0,
    REMIND: 1,
    WARNING: 2,
    ERROR: 3,
    CRITICAL: 4,
    URGENT: 5,
  };
  return ranks[level] || 0;
}
