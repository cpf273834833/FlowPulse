import React, { useEffect, useMemo, useState } from 'react';
import ApiOutlined from '@uyun/icons/ApiOutlined';
import CheckCircleOutlined from '@uyun/icons/CheckCircleOutlined';
import ClockCircleOutlined from '@uyun/icons/ClockCircleOutlined';
import EditOutlined from '@uyun/icons/EditOutlined';
import SearchOutlined from '@uyun/icons/SearchOutlined';
import SettingOutlined from '@uyun/icons/SettingOutlined';
import { environmentRegionApi } from '../../api/environmentRegionApi';
import { executorNodeApi } from '../../api/executorNodeApi';
import { metricApi } from '../../api/metricApi';
import Pagination from '../../components/Pagination';
import EnvironmentScopeTree from '../../components/EnvironmentScopeTree';
import SelectControl from '../../components/SelectControl';
import { StatCards } from '../../components/PageChrome';
import Toast from '../../components/Toast';
import { t } from '../../i18n';
import './CollectionTaskPage.css';

const EMPTY_REGION_PAGE = { environments: [], regions: [] };
const EMPTY_TASK_PAGE = { configs: { records: [], total: 0, pageNo: 1, pageSize: 10 }, stats: [] };

const DEFAULT_TASK_FORM = {
  objectType: '',
  objectId: '',
  objectCode: '',
  objectName: '',
  metricDefinitionId: '',
  implementationId: '',
  executionMode: 'SERVER',
  executorNodeId: '',
  intervalSec: 300,
  parameterJson: '{}',
  enabled: true,
  description: '',
};

const STATUS_OPTIONS = [
  ['', 'collectionTask.allStatus'],
  ['true', 'collectionTask.enabled'],
  ['false', 'collectionTask.disabled'],
];

const EXECUTION_OPTIONS = [
  ['SERVER', 'metric.method.server'],
  ['SSH', 'metric.method.ssh'],
  ['AGENT', 'metric.method.agent'],
  ['EXPRESSION', 'metric.method.expression'],
];

export default function CollectionTaskPage() {
  const [regionPage, setRegionPage] = useState(EMPTY_REGION_PAGE);
  const [tasks, setTasks] = useState(EMPTY_TASK_PAGE);
  const [definitions, setDefinitions] = useState([]);
  const [implementations, setImplementations] = useState([]);
  const [executorNodes, setExecutorNodes] = useState([]);
  const [scope, setScope] = useState({ envId: '', regionId: '' });
  const [taskQuery, setTaskQuery] = useState({ pageNo: 1, pageSize: 10 });
  const [selectedTaskId, setSelectedTaskId] = useState('');
  const [route, setRoute] = useState({ name: 'list' });
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('');
  const [loading, setLoading] = useState(false);

  const metricIndex = useMemo(() => indexById(definitions), [definitions]);
  const implementationIndex = useMemo(() => indexById(implementations), [implementations]);
  const executorIndex = useMemo(() => indexById(executorNodes), [executorNodes]);
  const selectedTask = tasks.configs.records.find((item) => item.id === selectedTaskId) || tasks.configs.records[0];

  useEffect(() => {
    loadBootstrap();
  }, []);

  useEffect(() => {
    if (!message) {
      return undefined;
    }
    const timer = window.setTimeout(() => {
      setMessage('');
      setMessageType('');
    }, 3000);
    return () => window.clearTimeout(timer);
  }, [message]);

  useEffect(() => {
    loadTasks({ ...taskQuery, pageNo: 1 });
  }, [scope.envId, scope.regionId]);

  async function loadBootstrap() {
    setLoading(true);
    try {
      const [regions, metricPage, implementationPage, executorPage] = await Promise.all([
        environmentRegionApi.page(),
        metricApi.page({ pageNo: 1, pageSize: 200 }),
        metricApi.implementationPage({ pageNo: 1, pageSize: 300 }),
        executorNodeApi.page({ pageNo: 1, pageSize: 300 }),
      ]);
      setRegionPage(regions || EMPTY_REGION_PAGE);
      setDefinitions(((metricPage || {}).metrics || {}).records || []);
      setImplementations(((implementationPage || {}).implementations || {}).records || []);
      setExecutorNodes(((executorPage || {}).nodes || {}).records || []);
      await loadTasks(taskQuery);
    } catch (error) {
      showMessage(error.message, 'error');
    } finally {
      setLoading(false);
    }
  }

  async function loadTasks(nextQuery = taskQuery) {
    try {
      const query = {
        ...nextQuery,
        envId: scope.envId || undefined,
        regionId: scope.regionId || undefined,
      };
      const data = await metricApi.resourceConfigPage(normalizeQuery(query));
      setTasks(data || EMPTY_TASK_PAGE);
      setTaskQuery(nextQuery);
      const records = (((data || EMPTY_TASK_PAGE).configs || {}).records || []);
      if (!records.some((item) => item.id === selectedTaskId)) {
        setSelectedTaskId(records[0] ? records[0].id : '');
      }
    } catch (error) {
      showMessage(error.message, 'error');
    }
  }

  function showMessage(text, type = '') {
    setMessage(text);
    setMessageType(type);
  }

  function selectScope(nextScope) {
    setScope({ envId: nextScope.envId || '', regionId: nextScope.regionId || '' });
    setTaskQuery({ ...taskQuery, pageNo: 1 });
    setSelectedTaskId('');
  }

  function openEdit(task) {
    setRoute({
      name: 'form',
      mode: 'edit',
      form: toForm(task),
    });
  }

  async function submitTask(form) {
    try {
      const payload = normalizeTaskPayload(form);
      await metricApi.updateResourceConfig(form.id, payload);
      showMessage(t('collectionTask.saved'), 'success');
      setRoute({ name: 'list' });
      await loadTasks(taskQuery);
    } catch (error) {
      showMessage(error.message, 'error');
    }
  }

  if (route.name === 'form') {
    return (
      <TaskFormPage
        route={route}
        implementations={implementations}
        executorNodes={executorNodes}
        metricIndex={metricIndex}
        implementationIndex={implementationIndex}
        onBack={() => setRoute({ name: 'list' })}
        onSubmit={submitTask}
        message={message}
        messageType={messageType}
        onClearMessage={() => showMessage('')}
      />
    );
  }

  if (route.name === 'detail') {
    const detailTask = tasks.configs.records.find((item) => item.id === route.id) || selectedTask;
    return (
      <TaskDetailPage
        task={detailTask}
        metric={detailTask && metricIndex[detailTask.metricDefinitionId]}
        implementation={detailTask && implementationIndex[detailTask.implementationId]}
        executor={detailTask && executorIndex[detailTask.executorNodeId]}
        onBack={() => setRoute({ name: 'list' })}
        onEdit={() => openEdit(detailTask)}
        message={message}
        messageType={messageType}
        onClearMessage={() => showMessage('')}
      />
    );
  }

  const selectedScopeRegion = regionPage.regions.find((item) => item.id === scope.regionId);
  const selectedScopeEnvironment = regionPage.environments.find((item) => item.id === scope.envId);
  const scopeLabel = selectedScopeRegion?.regionName || selectedScopeEnvironment?.envName || t('collectionTask.allScope');

  return (
    <section className="fp-page fp-collection-task">
      <div className="fp-page__header">
        <div>
          <h1>{t('menuCollectionTask')}</h1>
          <p>{t('collectionTask.pageDesc')}</p>
        </div>
      </div>

      <Toast message={message} type={messageType} onClose={() => showMessage('')} />

      <StatCards
        columns={5}
        stats={[
          {
            key: 'current-scope',
            title: t('collectionTask.scopeTree'),
            value: scopeLabel,
            description: '当前查询范围',
            kind: 'resource',
          },
          ...statCards(tasks).map((stat) => ({
            key: stat.label,
            title: stat.label,
            value: stat.value,
            description: stat.description,
          })),
        ]}
      />

      <div className="fp-task-workbench">
        <ScopePanel
          environments={regionPage.environments}
          regions={regionPage.regions}
          scope={scope}
          onSelect={selectScope}
        />

        <div className="fp-card fp-task-list-panel">
          <div className="fp-task-toolbar">
            <div>
              <h2>{t('collectionTask.taskList')}</h2>
              <p>{t('collectionTask.queryOnlyDesc')}</p>
            </div>
            <div className="fp-filter-row fp-filter-row--task">
              <label className="fp-inline-search">
                <SearchOutlined />
                <input
                  value={taskQuery.keyword || ''}
                  placeholder={t('collectionTask.search')}
                  onChange={(event) => setTaskQuery({ ...taskQuery, keyword: event.target.value })}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                      loadTasks({ ...taskQuery, pageNo: 1 });
                    }
                  }}
                />
              </label>
              <SelectControl
                value={taskQuery.enabled === undefined ? '' : String(taskQuery.enabled)}
                options={STATUS_OPTIONS.map(([value, label]) => [value, t(label)])}
                onChange={(enabled) => loadTasks({ ...taskQuery, enabled: enabled || undefined, pageNo: 1 })}
              />
            </div>
          </div>

          <div className="fp-compact-list">
            {tasks.configs.records.map((task) => (
              <div
                className={`fp-compact-row fp-compact-row--task ${selectedTaskId === task.id ? 'is-selected' : ''}`}
                role="button"
                tabIndex={0}
                key={task.id}
                onClick={() => setSelectedTaskId(task.id)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    setSelectedTaskId(task.id);
                  }
                }}
              >
                <div className="fp-compact-row__identity"><strong>{task.objectName}</strong><em>{task.objectCode}</em></div>
                <div className="fp-compact-row__metric"><span>{task.metricName || '-'}</span><strong>{formatMetricValue(task.currentValue)}</strong></div>
                <div className="fp-compact-row__datum"><span>{t('metric.implementation')}</span><strong>{task.implementationName || t('metric.useDefaultImplementation')}</strong></div>
                <div className="fp-compact-row__datum"><span>{t('metric.executionMode')}</span><strong>{executionLabel(task.executionMode)}</strong></div>
                <div className="fp-compact-row__datum"><span>{t('metric.interval')}</span><strong>{task.intervalSec || '-'}s</strong></div>
                <div className="fp-compact-row__datum"><span>{t('collectionTask.nextCollectAt')}</span><strong>{formatTime(task.nextCollectAt)}</strong></div>
                <StatusPill status={task.lastCollectStatus} enabled={task.enabled} />
                <span className="fp-compact-row__actions" onClick={(event) => event.stopPropagation()}>
                  <button type="button" onClick={() => setRoute({ name: 'detail', id: task.id })}>{t('detail')}</button>
                  <button type="button" onClick={() => openEdit(task)}>{t('collectionTask.config')}</button>
                </span>
              </div>
            ))}
            {tasks.configs.records.length === 0 && <div className="fp-empty-row">{loading ? t('loading') : t('empty')}</div>}
          </div>
          <Pagination
            pageNo={tasks.configs.pageNo}
            pageSize={tasks.configs.pageSize}
            total={tasks.configs.total}
            onChange={(next) => loadTasks({ ...taskQuery, ...next })}
          />
        </div>
      </div>
    </section>
  );
}

function ScopePanel({ environments, regions, scope, onSelect }) {
  return (
    <EnvironmentScopeTree environments={environments} regions={regions} selectedEnvId={scope.envId} selectedRegionId={scope.regionId} onSelect={(envId, regionId) => onSelect({ envId: envId || undefined, regionId: regionId || undefined })} title={t('collectionTask.scopeTree')} allLabel={t('collectionTask.allScope')} allHint={t('collectionTask.allTask')} managementLabel={t('managementRegion')} computeLabel={t('computeRegion')} className="fp-task-scope" />
  );
}

function TaskFormPage({ route, implementations, executorNodes, metricIndex, implementationIndex, onBack, onSubmit, message, messageType, onClearMessage }) {
  const [form, setForm] = useState(route.form || DEFAULT_TASK_FORM);
  const metric = metricIndex[form.metricDefinitionId];
  const availableImplementations = implementations.filter((item) => !form.metricDefinitionId || item.metricDefinitionId === form.metricDefinitionId);
  const selectedImplementation = implementationIndex[form.implementationId];

  function update(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function submit(event) {
    event.preventDefault();
    onSubmit(form);
  }

  return (
    <section className="fp-page fp-secondary-page">
      <button className="fp-link-button fp-back-link" type="button" onClick={onBack}>{t('collectionTask.back')}</button>
      <div className="fp-detail-hero fp-task-form-hero">
        <div>
          <span className="fp-kicker">{route.mode === 'edit' ? t('collectionTask.edit') : t('collectionTask.add')}</span>
          <h1>{form.objectName || '-'}</h1>
          <p>{t('collectionTask.formDesc')}</p>
        </div>
        <div className="fp-actions fp-actions--wrap">
          <button className="fp-button" type="button" onClick={onBack}>{t('cancel')}</button>
          <button className="fp-button fp-button--primary" type="submit" form="collection-task-form">{t('save')}</button>
        </div>
      </div>
      <Toast message={message} type={messageType} onClose={onClearMessage} />
      <form id="collection-task-form" className="fp-form fp-task-form" onSubmit={submit}>
        <FormSection title={t('collectionTask.objectSection')} desc={t('collectionTask.objectSectionDesc')}>
          <label className="fp-field">
            <span>{t('metric.objectType')}</span>
            <input value={form.objectType || '-'} disabled />
          </label>
          <label className="fp-field">
            <span>{t('collectionTask.resourceObject')}</span>
            <input value={form.objectName} disabled />
          </label>
          <label className="fp-field">
            <span>{t('metric.objectId')}</span>
            <input value={form.objectCode || '-'} disabled />
          </label>
          <label className="fp-field">
            <span>{t('metric.code')}</span>
            <input value={(metric && metric.code) || form.metricCode || '-'} disabled />
          </label>
        </FormSection>

        <FormSection title={t('collectionTask.metricSection')} desc={t('collectionTask.metricSectionDesc')}>
          <label className="fp-field">
            <span>{t('metric.name')}</span>
            <input value={(metric && metric.name) || form.metricName || '-'} disabled />
          </label>
          <label className="fp-field">
            <span>{t('metric.implementation')}</span>
            <select value={form.implementationId || ''} onChange={(event) => update('implementationId', event.target.value)}>
              <option value="">{t('metric.useDefaultImplementation')}</option>
              {availableImplementations.map((item) => <option key={item.id} value={item.id}>{item.name} / {implementationTypeLabel(item.implementationType)}</option>)}
            </select>
          </label>
          <Info label={t('metric.unit')} value={(metric && metric.unit) || '-'} />
          <Info label={t('metric.implType')} value={selectedImplementation ? implementationTypeLabel(selectedImplementation.implementationType) : '-'} />
        </FormSection>

        <FormSection title={t('collectionTask.executeSection')} desc={t('collectionTask.executeSectionDesc')}>
          <label className="fp-field">
            <span>{t('metric.executionMode')}</span>
            <select value={form.executionMode || 'SERVER'} onChange={(event) => update('executionMode', event.target.value)}>
              {EXECUTION_OPTIONS.map(([value, label]) => <option key={value} value={value}>{t(label)}</option>)}
            </select>
          </label>
          <label className="fp-field">
            <span>{t('collectionTask.executorNode')}</span>
            <select value={form.executorNodeId || ''} onChange={(event) => update('executorNodeId', event.target.value)} disabled={form.executionMode === 'SERVER' || form.executionMode === 'EXPRESSION'}>
              <option value="">{t('selectPlaceholder')}</option>
              {executorNodes.map((node) => <option key={node.id} value={node.id}>{node.host}</option>)}
            </select>
          </label>
          <label className="fp-field">
            <span>{t('metric.interval')}</span>
            <input type="number" min="1" value={form.intervalSec || 300} onChange={(event) => update('intervalSec', Number(event.target.value))} required />
          </label>
          <label className="fp-field fp-field--switch">
            <span>{t('metric.status')}</span>
            <button className={`fp-switch-text ${form.enabled ? 'is-on' : ''}`} type="button" onClick={() => update('enabled', !form.enabled)}>
              <i />
              {form.enabled ? t('collectionTask.enabled') : t('collectionTask.disabled')}
            </button>
          </label>
        </FormSection>

        <FormSection title={t('collectionTask.parameterSection')} desc={t('collectionTask.parameterSectionDesc')}>
          <label className="fp-field fp-field--wide">
            <span>{t('metric.parameterJson')}</span>
            <textarea value={form.parameterJson || ''} rows={8} onChange={(event) => update('parameterJson', event.target.value)} />
          </label>
          <label className="fp-field fp-field--wide">
            <span>{t('description')}</span>
            <textarea value={form.description || ''} rows={3} onChange={(event) => update('description', event.target.value)} />
          </label>
        </FormSection>
      </form>
    </section>
  );
}

function TaskDetailPage({ task, metric, implementation, executor, onBack, onEdit, message, messageType, onClearMessage }) {
  if (!task) {
    return null;
  }
  return (
    <section className="fp-page fp-secondary-page">
      <button className="fp-link-button fp-back-link" type="button" onClick={onBack}>{t('collectionTask.back')}</button>
      <div className="fp-detail-hero">
        <div>
          <span className="fp-kicker">{task.objectType}</span>
          <h1>{task.objectName}</h1>
          <p>{task.objectCode}</p>
        </div>
        <div className="fp-actions fp-actions--wrap">
          <StatusPill status={task.lastCollectStatus} enabled={task.enabled} />
          <button className="fp-button" type="button" onClick={onEdit}><EditOutlined />{t('collectionTask.config')}</button>
        </div>
      </div>
      <Toast message={message} type={messageType} onClose={onClearMessage} />
      <div className="fp-detail-sections fp-task-detail-grid">
        <DetailSection title={t('collectionTask.taskRelation')}>
          <Info label={t('collectionTask.resourceObject')} value={task.objectName} />
          <Info label={t('metric.code')} value={task.metricCode} />
          <Info label={t('metric.name')} value={(metric && metric.name) || task.metricName} />
          <Info label={t('metric.implementation')} value={(implementation && implementation.name) || task.implementationName || t('metric.useDefaultImplementation')} />
        </DetailSection>
        <DetailSection title={t('collectionTask.executeSection')}>
          <Info label={t('metric.executionMode')} value={executionLabel(task.executionMode)} />
          <Info label={t('collectionTask.executorNode')} value={executor ? executor.host : task.executorNodeId || '-'} />
          <Info label={t('metric.interval')} value={`${task.intervalSec || '-'}s`} />
          <Info label={t('metric.status')} value={task.enabled ? t('collectionTask.enabled') : t('collectionTask.disabled')} />
        </DetailSection>
        <DetailSection title={t('collectionTask.runtimeState')}>
          <Info label={t('infrastructure.currentMetricValue')} value={formatMetricValue(task.currentValue)} />
          <Info label={t('infrastructure.currentMetricAt')} value={formatTime(task.currentValueAt)} />
          <Info label={t('metric.collectStatus')} value={collectStatusText(task.lastCollectStatus, task.enabled)} />
          <Info label={t('collectionTask.lastCollectAt')} value={formatTime(task.lastCollectAt)} />
          <Info label={t('collectionTask.nextCollectAt')} value={formatTime(task.nextCollectAt)} />
          <Info label={t('collectionTask.lastMessage')} value={task.lastCollectMessage || '-'} />
        </DetailSection>
        <DetailSection title={t('collectionTask.parameterSection')}>
          <div className="fp-code-box">
            <span>{t('metric.parameterJson')}</span>
            <pre>{task.parameterJson || '{}'}</pre>
          </div>
          <Info label={t('description')} value={task.description || '-'} />
        </DetailSection>
      </div>
    </section>
  );
}

function FormSection({ title, desc, children }) {
  return (
    <fieldset className="fp-form-section">
      <legend>{title}</legend>
      <p>{desc}</p>
      {children}
    </fieldset>
  );
}

function DetailSection({ title, children }) {
  return (
    <section className="fp-card fp-detail-section">
      <h2>{title}</h2>
      <div className="fp-info-grid">{children}</div>
    </section>
  );
}

function Info({ label, value }) {
  return (
    <div className="fp-info-box">
      <span>{label}</span>
      <strong><span>{value || '-'}</span></strong>
    </div>
  );
}

function StatusPill({ status, enabled }) {
  const type = enabled === false ? 'muted' : statusType(status);
  return (
    <span className={`fp-mini-tag fp-mini-tag--${type}`}>
      <i />
      {collectStatusText(status, enabled)}
    </span>
  );
}

function statCards(page) {
  const records = ((page.configs || {}).records || []);
  const stats = page.stats || [];
  const total = ((page.configs || {}).total !== undefined) ? page.configs.total : records.length;
  const enabled = readStat(stats, 'enabled', records.filter((item) => item.enabled).length);
  const abnormal = records.filter((item) => item.lastCollectStatus === 'ERROR').length;
  const waiting = Math.max(0, total - enabled);
  return [
    { label: t('collectionTask.total'), value: total, description: t('collectionTask.totalDesc'), Icon: SettingOutlined },
    { label: t('collectionTask.enabled'), value: enabled, description: t('collectionTask.enabledDesc'), Icon: CheckCircleOutlined },
    { label: t('collectionTask.abnormal'), value: abnormal, description: t('collectionTask.abnormalDesc'), Icon: ApiOutlined },
    { label: t('collectionTask.waiting'), value: waiting, description: t('collectionTask.waitingDesc'), Icon: ClockCircleOutlined },
  ];
}

function readStat(stats, key, fallback) {
  const found = stats.find((item) => item.key === key || item.code === key || item.label === key);
  return found ? found.value : fallback;
}

function toForm(task) {
  return {
    ...DEFAULT_TASK_FORM,
    ...task,
    enabled: task.enabled !== false,
    parameterJson: task.parameterJson || '{}',
    intervalSec: task.intervalSec || 300,
  };
}

function normalizeTaskPayload(form) {
  return {
    objectType: form.objectType,
    objectId: form.objectId,
    objectCode: form.objectCode,
    objectName: form.objectName,
    metricDefinitionId: form.metricDefinitionId,
    implementationId: form.implementationId || '',
    executionMode: form.executionMode || 'SERVER',
    executorNodeId: form.executorNodeId || '',
    intervalSec: Number(form.intervalSec) || 300,
    parameterJson: form.parameterJson || '{}',
    enabled: form.enabled !== false,
    description: form.description || '',
  };
}

function normalizeQuery(query) {
  const next = { ...query };
  if (next.enabled === 'true') {
    next.enabled = true;
  } else if (next.enabled === 'false') {
    next.enabled = false;
  } else if (next.enabled === '') {
    delete next.enabled;
  }
  return next;
}

function indexById(list) {
  return (list || []).reduce((index, item) => {
    index[item.id] = item;
    return index;
  }, {});
}

function formatTime(value) {
  if (!value) {
    return '-';
  }
  return new Date(Number(value)).toLocaleString('zh-CN', { hour12: false });
}

function formatMetricValue(value) {
  if (value === undefined || value === null || value === '') {
    return '-';
  }
  const number = Number(value);
  if (!Number.isFinite(number)) {
    return '-';
  }
  return number.toFixed(4).replace(/\.?0+$/, '');
}

function executionLabel(value) {
  const found = EXECUTION_OPTIONS.find(([key]) => key === value);
  return found ? t(found[1]) : value || '-';
}

function implementationTypeLabel(value) {
  const map = {
    BUILT_IN: 'metric.impl.builtIn',
    SHELL: 'metric.impl.shell',
    PYTHON: 'metric.impl.python',
    EXPRESSION: 'metric.impl.expression',
  };
  return t(map[value] || value || 'metric.implementation');
}

function statusType(status) {
  if (status === 'NORMAL' || status === 'SUCCESS') {
    return 'success';
  }
  if (status === 'ERROR' || status === 'FAILED') {
    return 'danger';
  }
  return 'warning';
}

function collectStatusText(status, enabled) {
  if (enabled === false) {
    return t('collectionTask.disabled');
  }
  if (status === 'NORMAL' || status === 'SUCCESS') {
    return t('metric.collectNormal');
  }
  if (status === 'ERROR' || status === 'FAILED') {
    return t('metric.collectError');
  }
  return t('metric.collectUnknown');
}
