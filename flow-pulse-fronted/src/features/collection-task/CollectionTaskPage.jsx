import React, { useEffect, useMemo, useState } from 'react';
import ApiOutlined from '@uyun/icons/ApiOutlined';
import CheckCircleOutlined from '@uyun/icons/CheckCircleOutlined';
import ClockCircleOutlined from '@uyun/icons/ClockCircleOutlined';
import DeleteOutlined from '@uyun/icons/DeleteOutlined';
import EditOutlined from '@uyun/icons/EditOutlined';
import PlusOutlined from '@uyun/icons/PlusOutlined';
import SearchOutlined from '@uyun/icons/SearchOutlined';
import SettingOutlined from '@uyun/icons/SettingOutlined';
import { environmentRegionApi } from '../../api/environmentRegionApi';
import { executorNodeApi } from '../../api/executorNodeApi';
import { infrastructureApi } from '../../api/infrastructureApi';
import { metricApi } from '../../api/metricApi';
import ConfirmDialog from '../../components/ConfirmDialog';
import Pagination from '../../components/Pagination';
import Toast from '../../components/Toast';
import { t } from '../../i18n';
import './CollectionTaskPage.css';

const EMPTY_REGION_PAGE = { environments: [], regions: [] };
const EMPTY_INFRA_PAGE = { infrastructures: { records: [], total: 0 }, environments: [], regions: [] };
const EMPTY_RESOURCE_PAGE = { records: [], total: 0, pageNo: 1, pageSize: 10 };
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
  const [infraPage, setInfraPage] = useState(EMPTY_INFRA_PAGE);
  const [tasks, setTasks] = useState(EMPTY_TASK_PAGE);
  const [definitions, setDefinitions] = useState([]);
  const [implementations, setImplementations] = useState([]);
  const [executorNodes, setExecutorNodes] = useState([]);
  const [resources, setResources] = useState(EMPTY_RESOURCE_PAGE);
  const [scope, setScope] = useState({ envId: '', regionId: '' });
  const [resourceInfrastructureId, setResourceInfrastructureId] = useState('');
  const [taskQuery, setTaskQuery] = useState({ pageNo: 1, pageSize: 10 });
  const [resourceQuery, setResourceQuery] = useState({ pageNo: 1, pageSize: 10 });
  const [selectedTaskId, setSelectedTaskId] = useState('');
  const [route, setRoute] = useState({ name: 'list' });
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('');
  const [confirm, setConfirm] = useState(null);
  const [loading, setLoading] = useState(false);

  const infrastructureIndex = useMemo(() => indexById(infraPage.infrastructures.records), [infraPage.infrastructures.records]);
  const metricIndex = useMemo(() => indexById(definitions), [definitions]);
  const implementationIndex = useMemo(() => indexById(implementations), [implementations]);
  const executorIndex = useMemo(() => indexById(executorNodes), [executorNodes]);
  const availableInfrastructures = useMemo(
    () => filterInfrastructuresByScope(infraPage.infrastructures.records, scope),
    [infraPage.infrastructures.records, scope],
  );
  const selectedTask = tasks.configs.records.find((item) => item.id === selectedTaskId) || tasks.configs.records[0];
  const selectedInfrastructure = infrastructureIndex[resourceInfrastructureId];
  const selectedResource = resources.records.find((item) => item.id === route.resourceId);

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

  useEffect(() => {
    if (resourceInfrastructureId) {
      loadResources(resourceInfrastructureId, { ...resourceQuery, pageNo: 1 });
    } else {
      setResources(EMPTY_RESOURCE_PAGE);
    }
  }, [resourceInfrastructureId]);

  useEffect(() => {
    if (resourceInfrastructureId && !availableInfrastructures.some((item) => item.id === resourceInfrastructureId)) {
      setResourceInfrastructureId('');
    }
  }, [availableInfrastructures, resourceInfrastructureId]);

  async function loadBootstrap() {
    setLoading(true);
    try {
      const [regions, infra, metricPage, implementationPage, executorPage] = await Promise.all([
        environmentRegionApi.page(),
        infrastructureApi.page({ pageNo: 1, pageSize: 200 }),
        metricApi.page({ pageNo: 1, pageSize: 200 }),
        metricApi.implementationPage({ pageNo: 1, pageSize: 300 }),
        executorNodeApi.page({ pageNo: 1, pageSize: 300 }),
      ]);
      setRegionPage(regions || EMPTY_REGION_PAGE);
      setInfraPage(infra || EMPTY_INFRA_PAGE);
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

  async function loadResources(infrastructureId, nextQuery = resourceQuery) {
    try {
      const data = await infrastructureApi.resources(infrastructureId, nextQuery);
      setResources(data || EMPTY_RESOURCE_PAGE);
      setResourceQuery(nextQuery);
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

  function openCreate(resource) {
    const infra = infrastructureIndex[scope.infrastructureId];
    const objectType = resource ? resource.resourceType : (infra && infra.type) || '';
    setRoute({
      name: 'form',
      mode: 'create',
      resourceId: resource ? resource.id : '',
      form: {
        ...DEFAULT_TASK_FORM,
        objectType,
        objectId: resource ? resource.id : '',
        objectCode: resource ? resource.resourceCode : '',
        objectName: resource ? resource.resourceName : '',
      },
    });
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
      if (route.mode === 'edit' && form.id) {
        await metricApi.updateResourceConfig(form.id, payload);
      } else {
        await metricApi.createResourceConfig(payload);
      }
      showMessage(t('collectionTask.saved'), 'success');
      setRoute({ name: 'list' });
      await loadTasks(taskQuery);
    } catch (error) {
      showMessage(error.message, 'error');
    }
  }

  async function toggleTask(task) {
    try {
      await metricApi.updateResourceConfig(task.id, normalizeTaskPayload({ ...toForm(task), enabled: !task.enabled }));
      showMessage(task.enabled ? t('collectionTask.disabledMessage') : t('collectionTask.enabledMessage'), 'success');
      await loadTasks(taskQuery);
    } catch (error) {
      showMessage(error.message, 'error');
    }
  }

  function requestDelete(task) {
    setConfirm({
      title: t('confirmDelete'),
      content: t('deleteConfirmContent', task.metricName || task.objectName),
      onConfirm: async () => {
        try {
          await metricApi.deleteResourceConfig(task.id);
          setConfirm(null);
          showMessage(t('deleteSuccess'), 'success');
          await loadTasks(taskQuery);
        } catch (error) {
          setConfirm(null);
          showMessage(error.message, 'error');
        }
      },
    });
  }

  if (route.name === 'form') {
    return (
      <TaskFormPage
        route={route}
        definitions={definitions}
        implementations={implementations}
        executorNodes={executorNodes}
        resources={resources.records}
        selectedInfrastructure={selectedInfrastructure}
        selectedResource={selectedResource}
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
        onToggle={() => toggleTask(detailTask)}
        onDelete={() => requestDelete(detailTask)}
        message={message}
        messageType={messageType}
        onClearMessage={() => showMessage('')}
      />
    );
  }

  return (
    <section className="fp-page fp-collection-task">
      <div className="fp-page__header">
        <div>
          <h1>{t('menuCollectionTask')}</h1>
          <p>{t('collectionTask.pageDesc')}</p>
        </div>
        <button className="fp-button fp-button--primary" type="button" disabled={!resourceInfrastructureId} onClick={() => openCreate()}>
          <PlusOutlined />
          {t('collectionTask.add')}
        </button>
      </div>

      <Toast message={message} type={messageType} onClose={() => showMessage('')} />

      <div className="fp-stat-grid fp-stat-grid--four fp-metric-stats">
        {statCards(tasks).map((stat) => (
          <div className="fp-stat-card" key={stat.label}>
            <span className="fp-stat-card__icon"><stat.Icon /></span>
            <div>
              <span>{stat.label}</span>
              <strong>{stat.value}</strong>
              <em>{stat.description}</em>
            </div>
          </div>
        ))}
      </div>

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
              <p>{selectedInfrastructure ? t('collectionTask.scopeInfra', selectedInfrastructure.name) : t('collectionTask.scopeAll')}</p>
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
              <select
                className="fp-native-select"
                value={taskQuery.enabled === undefined ? '' : String(taskQuery.enabled)}
                onChange={(event) => loadTasks({ ...taskQuery, enabled: event.target.value || undefined, pageNo: 1 })}
              >
                {STATUS_OPTIONS.map(([value, label]) => <option key={label} value={value}>{t(label)}</option>)}
              </select>
            </div>
          </div>

          <div className="fp-data-table fp-task-table">
            <div className="fp-data-table__row fp-data-table__row--head">
              <span>{t('collectionTask.object')}</span>
              <span>{t('metric.name')}</span>
              <span>{t('metric.implementation')}</span>
              <span>{t('metric.executionMode')}</span>
              <span>{t('metric.interval')}</span>
              <span>{t('metric.collectStatus')}</span>
              <span>{t('operation')}</span>
            </div>
            {tasks.configs.records.map((task) => (
              <div
                className={`fp-data-table__row ${selectedTaskId === task.id ? 'is-selected' : ''}`}
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
                <strong>{task.objectName}<em>{task.objectCode}</em></strong>
                <span>{task.metricName || '-'}</span>
                <span>{task.implementationName || t('metric.useDefaultImplementation')}</span>
                <span>{executionLabel(task.executionMode)}</span>
                <span>{task.intervalSec || '-'}s</span>
                <StatusPill status={task.lastCollectStatus} enabled={task.enabled} />
                <span className="fp-row-actions" onClick={(event) => event.stopPropagation()}>
                  <button type="button" onClick={() => setRoute({ name: 'detail', id: task.id })}>{t('detail')}</button>
                  <button type="button" onClick={() => openEdit(task)}>{t('edit')}</button>
                  <button type="button" onClick={() => toggleTask(task)}>{task.enabled ? t('collectionTask.disable') : t('collectionTask.enable')}</button>
                  <button type="button" onClick={() => requestDelete(task)}>{t('delete')}</button>
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

        <aside className="fp-task-side">
          <TaskSidePanel
            task={selectedTask}
            metric={selectedTask && metricIndex[selectedTask.metricDefinitionId]}
            implementation={selectedTask && implementationIndex[selectedTask.implementationId]}
            executor={selectedTask && executorIndex[selectedTask.executorNodeId]}
            onDetail={() => selectedTask && setRoute({ name: 'detail', id: selectedTask.id })}
            onCreate={() => openCreate()}
          />
            <ResourcePanel
              infrastructure={selectedInfrastructure}
              infrastructures={availableInfrastructures}
              infrastructureId={resourceInfrastructureId}
              onInfrastructureChange={setResourceInfrastructureId}
              resources={resources}
              query={resourceQuery}
              onQueryChange={(next) => loadResources(resourceInfrastructureId, { ...resourceQuery, ...next })}
              onCreate={openCreate}
            />
        </aside>
      </div>

      <ConfirmDialog confirm={confirm} onCancel={() => setConfirm(null)} />
    </section>
  );
}

function ScopePanel({ environments, regions, scope, onSelect }) {
  const managementRegions = regions.filter((region) => region.regionType === 'MANAGEMENT');

  return (
    <aside className="fp-infra-tree fp-task-scope">
      <strong className="fp-infra-tree__title">{t('collectionTask.scopeTree')}</strong>
          <button className={!scope.envId && !scope.regionId ? 'is-active' : ''} type="button" onClick={() => onSelect({})}>
        <span>{t('collectionTask.allScope')}</span>
        <em>{t('collectionTask.allTask')}</em>
      </button>
      {environments.map((environment) => (
        <div className="fp-tree-group" key={environment.id}>
          <button className={scope.envId === environment.id && !scope.regionId ? 'is-active' : ''} type="button" onClick={() => onSelect({ envId: environment.id })}>
            <span>{environment.envName}</span>
            <em>{environment.envCode}</em>
          </button>
          <div className="fp-tree-children">
            {managementRegions.filter((region) => region.envId === environment.id).map((management) => (
              <div className="fp-tree-management" key={management.id}>
                <button className={scope.regionId === management.id ? 'is-active' : ''} type="button" onClick={() => onSelect({ envId: environment.id, regionId: management.id })}>
                  <span>{management.regionName}</span>
                  <em>{t('managementRegion')}</em>
                </button>
                <div className="fp-tree-computes">
                  {regions.filter((region) => region.parentRegionId === management.id).map((compute) => (
                    <div className="fp-tree-compute" key={compute.id}>
                      <button className={scope.regionId === compute.id ? 'is-active' : ''} type="button" onClick={() => onSelect({ envId: environment.id, regionId: compute.id })}>
                        <span>{compute.regionName}</span>
                        <em>{t('computeRegion')}</em>
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </aside>
  );
}

function ResourcePanel({ infrastructure, infrastructures, infrastructureId, onInfrastructureChange, resources, query, onQueryChange, onCreate }) {
  const [keyword, setKeyword] = useState(query.keyword || '');

  useEffect(() => {
    setKeyword(query.keyword || '');
  }, [query.keyword]);

  return (
    <section className="fp-task-resource-panel">
      <div className="fp-side-section__title">
        <h3>{t('collectionTask.resourcePool')}</h3>
        <span className="fp-mini-tag">{resources.total || 0}</span>
      </div>
      <select className="fp-native-select" value={infrastructureId || ''} onChange={(event) => onInfrastructureChange(event.target.value)}>
        <option value="">{t('collectionTask.selectInfrastructure')}</option>
        {infrastructures.map((item) => <option key={item.id} value={item.id}>{item.name} / {item.type}</option>)}
      </select>
      {!infrastructure ? (
        <div className="fp-side-empty">{t('collectionTask.selectInfrastructureFirst')}</div>
      ) : (
        <>
          <label className="fp-inline-search fp-task-resource-search">
            <SearchOutlined />
            <input
              value={keyword}
              placeholder={t('infrastructure.searchResource')}
              onChange={(event) => setKeyword(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  onQueryChange({ keyword, pageNo: 1 });
                }
              }}
            />
          </label>
          <div className="fp-side-card-list">
            {resources.records.map((resource) => (
              <button className="fp-side-card fp-resource-pick-card" type="button" key={resource.id} onClick={() => onCreate(resource)}>
                <strong>{resource.resourceName}</strong>
                <span>{resource.resourceCode}</span>
                <em>{resource.resourceType}</em>
              </button>
            ))}
            {resources.records.length === 0 && <div className="fp-side-empty">{t('empty')}</div>}
          </div>
          <Pagination
            pageNo={resources.pageNo}
            pageSize={resources.pageSize}
            total={resources.total}
            onChange={onQueryChange}
          />
        </>
      )}
    </section>
  );
}

function TaskSidePanel({ task, metric, implementation, executor, onDetail, onCreate }) {
  if (!task) {
    return (
      <section className="fp-metric-side fp-task-preview">
        <div className="fp-side-empty">{t('collectionTask.noTaskSelected')}</div>
        <button className="fp-button fp-button--primary" type="button" onClick={onCreate}>
          <PlusOutlined />
          {t('collectionTask.add')}
        </button>
      </section>
    );
  }
  return (
    <section className="fp-metric-side fp-task-preview">
      <div className="fp-metric-side__head">
        <div>
          <h2>{task.objectName}</h2>
          <p>{task.objectCode}</p>
        </div>
        <StatusPill status={task.lastCollectStatus} enabled={task.enabled} />
      </div>
      <div className="fp-side-section">
        <h3>{t('collectionTask.taskRelation')}</h3>
        <SideInfo label={t('metric.name')} value={(metric && metric.name) || task.metricName} />
        <SideInfo label={t('metric.implementation')} value={(implementation && implementation.name) || task.implementationName || t('metric.useDefaultImplementation')} />
        <SideInfo label={t('metric.executionMode')} value={executionLabel(task.executionMode)} />
        <SideInfo label={t('collectionTask.executorNode')} value={executor ? executor.host : task.executorNodeId || '-'} />
      </div>
      <div className="fp-side-section">
        <h3>{t('collectionTask.runtimeState')}</h3>
        <SideInfo label={t('metric.interval')} value={`${task.intervalSec || '-'}s`} />
        <SideInfo label={t('collectionTask.lastCollectAt')} value={formatTime(task.lastCollectAt)} />
        <SideInfo label={t('collectionTask.nextCollectAt')} value={formatTime(task.nextCollectAt)} />
        <SideInfo label={t('collectionTask.lastMessage')} value={task.lastCollectMessage || '-'} />
      </div>
      <div className="fp-metric-side__actions">
        <button className="fp-button fp-button--primary" type="button" onClick={onDetail}>{t('detail')}</button>
      </div>
    </section>
  );
}

function TaskFormPage({ route, definitions, implementations, executorNodes, resources, selectedInfrastructure, selectedResource, metricIndex, implementationIndex, onBack, onSubmit, message, messageType, onClearMessage }) {
  const [form, setForm] = useState(route.form || DEFAULT_TASK_FORM);
  const metric = metricIndex[form.metricDefinitionId];
  const availableImplementations = implementations.filter((item) => !form.metricDefinitionId || item.metricDefinitionId === form.metricDefinitionId);
  const selectedImplementation = implementationIndex[form.implementationId];

  useEffect(() => {
    if (route.mode === 'create' && selectedResource) {
      setForm((current) => ({
        ...current,
        objectType: selectedResource.resourceType,
        objectId: selectedResource.id,
        objectCode: selectedResource.resourceCode,
        objectName: selectedResource.resourceName,
      }));
    }
  }, [selectedResource, route.mode]);

  function update(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function chooseResource(id) {
    const resource = resources.find((item) => item.id === id);
    setForm((current) => ({
      ...current,
      objectId: resource ? resource.id : '',
      objectType: resource ? resource.resourceType : '',
      objectCode: resource ? resource.resourceCode : '',
      objectName: resource ? resource.resourceName : '',
    }));
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
          <h1>{route.mode === 'edit' ? (form.objectName || '-') : t('collectionTask.createTitle')}</h1>
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
            <span>{t('infrastructure.list')}</span>
            <input value={selectedInfrastructure ? selectedInfrastructure.name : '-'} disabled />
          </label>
          <label className="fp-field">
            <span>{t('collectionTask.resourceObject')}</span>
            {route.mode === 'edit' ? (
              <input value={form.objectName} disabled />
            ) : (
              <select value={form.objectId} onChange={(event) => chooseResource(event.target.value)} required>
                <option value="">{t('selectPlaceholder')}</option>
                {resources.map((resource) => <option key={resource.id} value={resource.id}>{resource.resourceName} / {resource.resourceCode}</option>)}
              </select>
            )}
          </label>
          <label className="fp-field">
            <span>{t('metric.objectType')}</span>
            <input value={form.objectType || '-'} disabled />
          </label>
          <label className="fp-field">
            <span>{t('metric.objectId')}</span>
            <input value={form.objectCode || '-'} disabled />
          </label>
        </FormSection>

        <FormSection title={t('collectionTask.metricSection')} desc={t('collectionTask.metricSectionDesc')}>
          <label className="fp-field">
            <span>{t('metric.name')}</span>
            <select value={form.metricDefinitionId} onChange={(event) => update('metricDefinitionId', event.target.value)} required disabled={route.mode === 'edit'}>
              <option value="">{t('selectPlaceholder')}</option>
              {definitions.map((item) => <option key={item.id} value={item.id}>{item.name} / {item.code}</option>)}
            </select>
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

function TaskDetailPage({ task, metric, implementation, executor, onBack, onEdit, onToggle, onDelete, message, messageType, onClearMessage }) {
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
          <button className="fp-button" type="button" onClick={onToggle}>{task.enabled ? t('collectionTask.disable') : t('collectionTask.enable')}</button>
          <button className="fp-button" type="button" onClick={onEdit}><EditOutlined />{t('edit')}</button>
          <button className="fp-button fp-button--ghost-danger" type="button" onClick={onDelete}><DeleteOutlined />{t('delete')}</button>
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

function SideInfo({ label, value }) {
  return (
    <div className="fp-side-info">
      <span>{label}</span>
      <strong>{value || '-'}</strong>
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

function filterInfrastructuresByScope(infrastructures, scope) {
  return (infrastructures || []).filter((item) => {
    if (scope.regionId) {
      return item.regionId === scope.regionId;
    }
    if (scope.envId) {
      return item.envId === scope.envId;
    }
    return true;
  });
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
