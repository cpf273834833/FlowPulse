import React, { useEffect, useMemo, useState } from 'react';
import ApiOutlined from '@uyun/icons/ApiOutlined';
import PlusOutlined from '@uyun/icons/PlusOutlined';
import SearchOutlined from '@uyun/icons/SearchOutlined';
import { metricApi } from '../../api/metricApi';
import Pagination from '../../components/Pagination';
import Toast from '../../components/Toast';
import { t } from '../../i18n';

const EMPTY_DEFINITION_PAGE = { metrics: { records: [], total: 0, pageNo: 1, pageSize: 10 }, stats: [] };
const EMPTY_IMPLEMENTATION_PAGE = { implementations: { records: [], total: 0, pageNo: 1, pageSize: 10 }, stats: [] };
const DEFAULT_DEFINITION = { metricCode: '', metricName: '', metricCategory: 'INFRASTRUCTURE', objectType: 'KAFKA', valueUnit: '', valuePrecision: 2, metricKind: 'RAW', instanceDimension: '', sourceMetricCode: '', deriveType: '', parameterSchemaJson: '', mappingJson: '', enabled: true, description: '' };
const DEFAULT_IMPLEMENTATION = { metricDefinitionId: '', implementationCode: '', implementationName: '', implementationType: 'SHELL', executionMode: 'SSH', scriptLanguage: 'shell', scriptContent: '', parameterSchemaJson: '', outputSchemaJson: '{"value":"number","timestamp":"number","message":"string"}', builtInCollector: '', defaultImplementation: false, enabled: true, timeoutSec: 30, description: '' };
const PARAMETER_SCHEMA_EXAMPLE = `{
  "topic": {
    "label": "Topic",
    "required": true,
    "dataType": "STRING",
    "defaultValue": "{sourceCode}",
    "helpText": "要查询积压的 Kafka Topic",
    "placeholders": {
      "sourceCode": {
        "sourceType": "SOURCE_NODE_RESOURCE_FIELD",
        "fieldName": "resourceCode",
        "missingPolicy": "ERROR"
      }
    }
  },
  "groupId": {
    "label": "消费组",
    "required": false,
    "dataType": "STRING",
    "defaultValue": "",
    "helpText": "可以填写固定消费组，也可以使用占位符动态生成"
  }
}`;
const SCRIPT_CONTENT_EXAMPLE = `#!/bin/bash
# 脚本输出必须是 JSON，value 是最终指标值。
echo '{"value": 1, "timestamp": 1782950400000, "message": "ok"}'`;
const OUTPUT_SCHEMA_HINT = `采集脚本或内置采集器最终只需要返回一个浮点指标值。
推荐输出：
{
  "value": 1.0,
  "timestamp": 1782950400000,
  "message": "ok"
}`;
const CATEGORY_OPTIONS = [['INFRASTRUCTURE', 'metric.category.infrastructure'], ['APPLICATION', 'metric.category.application'], ['EXECUTOR_NODE', 'metric.category.executorNode'], ['TOPOLOGY_NODE', 'metric.category.topologyNode'], ['TOPOLOGY_EDGE', 'metric.category.topologyEdge'], ['DERIVED', 'metric.category.derived']];
const OBJECT_TYPE_OPTIONS = [['KAFKA', 'Kafka'], ['KAFKA_TOPIC', 'Kafka Topic'], ['KAFKA_GROUP', 'Kafka Group'], ['ELASTICSEARCH', 'Elasticsearch'], ['ES_INDEX', 'ES Index'], ['ES_LOGICAL_INDEX', 'ES 逻辑索引'], ['SPARK', 'Spark'], ['SPARK_JOB', 'Spark 作业'], ['SPARK_LOGICAL_JOB', 'Spark 逻辑作业'], ['APPLICATION', 'metric.object.application'], ['EXECUTOR_NODE', 'metric.object.executorNode'], ['TOPOLOGY_NODE', 'metric.object.topologyNode'], ['TOPOLOGY_EDGE', 'metric.object.topologyEdge']];
const APPLICABILITY_SCOPE_OPTIONS = [['INFRASTRUCTURE', '基础设施自身'], ['RESOURCE', '资源对象'], ['APPLICATION', '应用服务'], ['EXECUTOR_NODE', '执行节点'], ['TOPOLOGY_NODE', '拓扑节点'], ['TOPOLOGY_EDGE', '拓扑连线'], ['DERIVED', '衍生指标']];
const RELATION_TYPE_OPTIONS = [['', '不限关系'], ['MANUAL', '手工关系'], ['KAFKA_CONSUME', 'Kafka 消费'], ['ES_WRITE', 'ES 写入'], ['APP_CALL', '应用调用'], ['DEPENDENCY', '依赖关系']];
const COLLECT_ANCHOR_OPTIONS = [['CURRENT_OBJECT', '当前对象'], ['SOURCE_OBJECT', '源节点对象'], ['TARGET_OBJECT', '目标节点对象'], ['RELATION_OBJECT', '连线关系'], ['TOPOLOGY_ELEMENT', '拓扑元素衍生'], ['CUSTOM', '自定义']];
const IMPLEMENTATION_TYPE_OPTIONS = [['BUILT_IN', 'metric.impl.builtIn'], ['SHELL', 'metric.impl.shell'], ['PYTHON', 'metric.impl.python'], ['EXPRESSION', 'metric.impl.expression']];
const EXECUTION_OPTIONS = [['SERVER', 'SERVER'], ['SSH', 'SSH'], ['AGENT', 'AGENT'], ['EXPRESSION', 'EXPRESSION']];
const ENABLED_OPTIONS = [['', 'metric.allEnabled'], ['true', 'metric.enabled'], ['false', 'metric.disabled']];
const METRIC_KIND_OPTIONS = [['RAW', '原始指标'], ['DERIVED', '衍生指标']];
const DERIVE_TYPE_OPTIONS = [['DELTA', '差值 DELTA'], ['DELTA_PER_SECOND', '每秒差值 DELTA/s']];

export default function MetricCenterPage() {
  const [activeTab, setActiveTab] = useState('definition');
  const [definitionPage, setDefinitionPage] = useState(EMPTY_DEFINITION_PAGE);
  const [implementationPage, setImplementationPage] = useState(EMPTY_IMPLEMENTATION_PAGE);
  const [definitionQuery, setDefinitionQuery] = useState({ pageNo: 1, pageSize: 10 });
  const [implementationQuery, setImplementationQuery] = useState({ pageNo: 1, pageSize: 10 });
  const [selectedDefinitionId, setSelectedDefinitionId] = useState('');
  const [selectedImplementationId, setSelectedImplementationId] = useState('');
  const [selectedImplementations, setSelectedImplementations] = useState([]);
  const [metricContext, setMetricContext] = useState(null);
  const [message, setMessage] = useState('');
  const [route, setRoute] = useState({ type: 'list' });

  const metrics = definitionPage.metrics.records;
  const implementations = implementationPage.implementations.records;
  const selectedDefinition = useMemo(() => metrics.find((item) => item.id === selectedDefinitionId) || metrics[0], [metrics, selectedDefinitionId]);
  const selectedImplementation = useMemo(() => implementations.find((item) => item.id === selectedImplementationId) || implementations[0], [implementations, selectedImplementationId]);

  useEffect(() => {
    const preset = readTopologyMetricPrefill();
    const nextDefinitionQuery = preset ? {
      ...definitionQuery,
      pageNo: 1,
      metricCategory: preset.topologyElementType === 'EDGE' ? 'TOPOLOGY_EDGE' : 'TOPOLOGY_NODE',
      objectType: preset.topologyElementType === 'EDGE' ? 'TOPOLOGY_EDGE' : 'TOPOLOGY_NODE',
    } : definitionQuery;
    if (preset) {
      setMetricContext(preset);
      setDefinitionQuery(nextDefinitionQuery);
      setActiveTab('definition');
      setMessage(`已进入 ${preset.objectName || preset.objectCode || '拓扑元素'} 的指标配置上下文`);
    }
    loadDefinitions(nextDefinitionQuery);
    loadImplementations(implementationQuery);
  }, []);

  useEffect(() => {
    if (!message) return undefined;
    const timer = window.setTimeout(() => setMessage(''), 3000);
    return () => window.clearTimeout(timer);
  }, [message]);

  useEffect(() => {
    if (selectedDefinition && !selectedDefinitionId) {
      setSelectedDefinitionId(selectedDefinition.id);
    }
  }, [selectedDefinition, selectedDefinitionId]);

  useEffect(() => {
    if (selectedImplementation && !selectedImplementationId) {
      setSelectedImplementationId(selectedImplementation.id);
    }
  }, [selectedImplementation, selectedImplementationId]);

  useEffect(() => {
    if (!selectedDefinition || activeTab !== 'definition') {
      return undefined;
    }
    let active = true;
    metricApi.implementationPage({ metricDefinitionId: selectedDefinition.id, pageNo: 1, pageSize: 20 })
      .then((data) => {
        if (active) {
          setSelectedImplementations((data.implementations && data.implementations.records) || []);
        }
      })
      .catch((error) => active && setMessage(error.message));
    return () => { active = false; };
  }, [selectedDefinition && selectedDefinition.id, activeTab]);

  async function loadDefinitions(nextQuery = definitionQuery) {
    try {
      const data = await metricApi.page(nextQuery);
      setDefinitionPage(data || EMPTY_DEFINITION_PAGE);
      setDefinitionQuery(nextQuery);
    } catch (error) {
      setMessage(error.message);
    }
  }

  async function loadImplementations(nextQuery = implementationQuery) {
    try {
      const data = await metricApi.implementationPage(nextQuery);
      setImplementationPage(data || EMPTY_IMPLEMENTATION_PAGE);
      setImplementationQuery(nextQuery);
    } catch (error) {
      setMessage(error.message);
    }
  }

  async function openDefinitionDetail(metric) {
    const detail = await metricApi.detail(metric.id);
    const related = await metricApi.implementationPage({ metricDefinitionId: metric.id, pageNo: 1, pageSize: 100 });
    setRoute({ type: 'definitionDetail', item: detail, implementations: (related.implementations && related.implementations.records) || [] });
  }

  async function openImplementationDetail(item) {
    const detail = await metricApi.implementationDetail(item.id);
    setRoute({ type: 'implementationDetail', item: detail });
  }

  async function saveDefinition(form) {
    try {
      const payload = { ...form, valuePrecision: Number(form.valuePrecision || 2), enabled: form.enabled !== false };
      const saved = form.id ? await metricApi.update(form.id, payload) : await metricApi.create(payload);
      setMessage(t('metric.saved'));
      await loadDefinitions(definitionQuery);
      await openDefinitionDetail(saved);
    } catch (error) {
      setMessage(error.message);
    }
  }

  async function saveImplementation(form) {
    try {
      const payload = { ...form, timeoutSec: Number(form.timeoutSec || 30), enabled: form.enabled !== false };
      const saved = form.id ? await metricApi.updateImplementation(form.id, payload) : await metricApi.createImplementation(payload);
      setMessage(t('metric.implementationSaved'));
      await loadDefinitions(definitionQuery);
      await loadImplementations(implementationQuery);
      await openImplementationDetail(saved);
    } catch (error) {
      setMessage(error.message);
    }
  }

  if (route.type === 'definitionDetail') {
    return <DefinitionDetailPage item={route.item} implementations={route.implementations} onBack={() => setRoute({ type: 'list' })} onEdit={() => setRoute({ type: 'definitionForm', form: { ...DEFAULT_DEFINITION, ...route.item } })} onOpenImplementation={openImplementationDetail} message={message} onClear={() => setMessage('')} />;
  }
  if (route.type === 'definitionForm') {
    return <DefinitionFormPage form={route.form} onBack={() => setRoute({ type: 'list' })} onSubmit={saveDefinition} message={message} onClear={() => setMessage('')} />;
  }
  if (route.type === 'implementationDetail') {
    return <ImplementationDetailPage item={route.item} onBack={() => setRoute({ type: 'list' })} onEdit={() => setRoute({ type: 'implementationForm', form: { ...DEFAULT_IMPLEMENTATION, ...route.item } })} message={message} onClear={() => setMessage('')} />;
  }
  if (route.type === 'implementationForm') {
    return <ImplementationFormPage form={route.form} metrics={metrics} onBack={() => setRoute({ type: 'list' })} onSubmit={saveImplementation} message={message} onClear={() => setMessage('')} />;
  }

  const stats = activeTab === 'implementation' ? implementationPage.stats : definitionPage.stats;
  return (
    <section className="fp-page fp-metric-center">
      <div className="fp-page__header fp-metric-center__header">
        <div>
          <h1>{t('menuMetricCenter')}</h1>
          <p>{t('metric.pageDesc')}</p>
        </div>
        <div className="fp-actions">
          <button className="fp-button fp-button--primary" type="button" onClick={() => setRoute({ type: 'definitionForm', form: { ...DEFAULT_DEFINITION } })}><PlusOutlined />{t('metric.add')}</button>
          <button className="fp-button" type="button" onClick={() => setRoute({ type: 'implementationForm', form: { ...DEFAULT_IMPLEMENTATION, metricDefinitionId: selectedDefinition && selectedDefinition.id } })}><PlusOutlined />{t('metric.addImplementation')}</button>
        </div>
      </div>
      <Toast message={message} onClose={() => setMessage('')} />
      {metricContext ? (
        <div className="fp-metric-context-banner">
          <div>
            <strong>拓扑指标配置</strong>
            <span>{metricContext.topologyName || '当前拓扑'} / {metricContext.topologyElementType === 'EDGE' ? '连线' : '节点'} / {metricContext.objectName || metricContext.objectCode}</span>
          </div>
          <button className="fp-link-button" type="button" onClick={() => setMetricContext(null)}>清除上下文</button>
        </div>
      ) : null}
      <div className="fp-stat-grid fp-stat-grid--four fp-metric-stats">
        {stats.map((stat) => <div className="fp-stat" key={stat.title}><div className="fp-stat__icon"><ApiOutlined /></div><div><span>{stat.title}</span><strong>{stat.value}</strong><em>{stat.description}</em></div></div>)}
      </div>
      <div className="fp-metric-workbench">
        <section className="fp-card fp-metric-workbench__main">
          <div className="fp-metric-toolbar">
            <div className="fp-tabs fp-tabs--flat">
              <button className={activeTab === 'definition' ? 'is-active' : ''} type="button" onClick={() => setActiveTab('definition')}>{t('metric.definitionView')}</button>
              <button className={activeTab === 'implementation' ? 'is-active' : ''} type="button" onClick={() => setActiveTab('implementation')}>{t('metric.implementationView')}</button>
            </div>
            <span className="fp-muted-text">{activeTab === 'definition' ? t('metric.definitionViewDesc') : t('metric.implementationViewDesc')}</span>
          </div>
          {activeTab === 'definition' ? (
            <DefinitionList page={definitionPage} query={definitionQuery} selectedId={selectedDefinition && selectedDefinition.id} onQuery={setDefinitionQuery} onLoad={loadDefinitions} onSelect={setSelectedDefinitionId} onOpen={openDefinitionDetail} />
          ) : (
            <ImplementationList page={implementationPage} metrics={metrics} query={implementationQuery} selectedId={selectedImplementation && selectedImplementation.id} onQuery={setImplementationQuery} onLoad={loadImplementations} onSelect={setSelectedImplementationId} onOpen={openImplementationDetail} />
          )}
        </section>
      </div>
    </section>
  );
}

function DefinitionList({ page, query, selectedId, onQuery, onLoad, onSelect, onOpen }) {
  return (
    <>
      <div className="fp-filter-row fp-filter-row--metric fp-metric-filter">
        <SearchInput value={query.keyword || ''} placeholder={t('metric.search')} onChange={(keyword) => onQuery({ ...query, keyword, pageNo: 1 })} onSearch={() => onLoad({ ...query, pageNo: 1 })} />
        <SelectBare value={query.metricCategory || ''} options={[['', 'metric.allCategory']].concat(CATEGORY_OPTIONS)} onChange={(metricCategory) => onQuery({ ...query, metricCategory, pageNo: 1 })} />
        <SelectBare value={query.objectType || ''} options={[['', 'metric.allObjectType']].concat(OBJECT_TYPE_OPTIONS)} onChange={(objectType) => onQuery({ ...query, objectType, pageNo: 1 })} />
        <SelectBare value={query.enabled || ''} options={ENABLED_OPTIONS} onChange={(enabled) => onQuery({ ...query, enabled, pageNo: 1 })} />
        <button className="fp-button" type="button" onClick={() => onLoad({ ...query, pageNo: 1 })}>{t('filter')}</button>
      </div>
      <div className="fp-data-table fp-metric-table fp-metric-table--polished">
        <div className="fp-data-table__row fp-data-table__row--head"><span>{t('metric.name')}</span><span>{t('metric.objectType')}</span><span>{t('metric.unit')}</span><span>{t('metric.implementationCount')}</span><span>{t('metric.mappingStatus')}</span><span>{t('metric.status')}</span><span>{t('operation')}</span></div>
        {page.metrics.records.length === 0 ? <div className="fp-empty">{t('empty')}</div> : null}
        {page.metrics.records.map((metric) => (
          <div className={`fp-data-table__row ${selectedId === metric.id ? 'is-selected' : ''}`} key={metric.id} onClick={() => onSelect(metric.id)}>
            <button className="fp-node-link" type="button" onClick={(event) => { event.stopPropagation(); onOpen(metric); }}>{metric.metricName}<em>{metric.metricCode}</em></button>
            <span><Tag>{labelOf(CATEGORY_OPTIONS, metric.metricCategory)}</Tag><Tag muted>{labelOf(OBJECT_TYPE_OPTIONS, metric.objectType)}</Tag></span>
            <span>{metric.valueUnit || '-'}</span>
            <span><button className="fp-count-link" type="button" onClick={(event) => { event.stopPropagation(); onOpen(metric); }}>{metric.implementationCount || 0}</button></span>
            <MappingPill mapped={hasMapping(metric)} />
            <span>{metric.systemBuiltin ? <Tag success>内置</Tag> : <StatusPill enabled={metric.enabled} />}</span>
            <button className="fp-link-button" type="button" onClick={(event) => { event.stopPropagation(); onOpen(metric); }}>{t('detail')}</button>
          </div>
        ))}
      </div>
      <Pagination pageNo={page.metrics.pageNo} pageSize={page.metrics.pageSize} total={page.metrics.total} onChange={(next) => onLoad({ ...query, ...next })} />
    </>
  );
}

function ImplementationList({ page, metrics, query, selectedId, onQuery, onLoad, onSelect, onOpen }) {
  return (
    <>
      <div className="fp-filter-row fp-filter-row--metric fp-metric-filter">
        <SearchInput value={query.keyword || ''} placeholder={t('metric.searchImplementation')} onChange={(keyword) => onQuery({ ...query, keyword, pageNo: 1 })} onSearch={() => onLoad({ ...query, pageNo: 1 })} />
        <SelectBare value={query.metricDefinitionId || ''} options={[['', 'metric.allMetric']].concat(metrics.map((item) => [item.id, `${item.metricName} / ${item.metricCode}`]))} onChange={(metricDefinitionId) => onQuery({ ...query, metricDefinitionId, pageNo: 1 })} />
        <SelectBare value={query.implementationType || ''} options={[['', 'metric.allImplementationType']].concat(IMPLEMENTATION_TYPE_OPTIONS)} onChange={(implementationType) => onQuery({ ...query, implementationType, pageNo: 1 })} />
        <SelectBare value={query.enabled || ''} options={ENABLED_OPTIONS} onChange={(enabled) => onQuery({ ...query, enabled, pageNo: 1 })} />
        <button className="fp-button" type="button" onClick={() => onLoad({ ...query, pageNo: 1 })}>{t('filter')}</button>
      </div>
      <div className="fp-data-table fp-implementation-table fp-metric-table--polished">
        <div className="fp-data-table__row fp-data-table__row--head"><span>{t('metric.implementation')}</span><span>{t('metric.name')}</span><span>{t('metric.implType')}</span><span>{t('metric.executionMode')}</span><span>{t('metric.defaultImplementation')}</span><span>{t('metric.status')}</span><span>{t('operation')}</span></div>
        {page.implementations.records.length === 0 ? <div className="fp-empty">{t('empty')}</div> : null}
        {page.implementations.records.map((item) => (
          <div className={`fp-data-table__row ${selectedId === item.id ? 'is-selected' : ''}`} key={item.id} onClick={() => onSelect(item.id)}>
            <button className="fp-node-link" type="button" onClick={(event) => { event.stopPropagation(); onOpen(item); }}>{item.implementationName}<em>{item.implementationCode}</em></button>
            <span>{item.metricName}<em>{item.metricCode}</em></span>
            <span>{labelOf(IMPLEMENTATION_TYPE_OPTIONS, item.implementationType)}</span>
            <span>{item.executionMode}</span>
            <span>{item.defaultImplementation ? <Tag success>{t('yes')}</Tag> : <Tag muted>{t('no')}</Tag>}</span>
            <span>{item.systemBuiltin ? <Tag success>内置</Tag> : <StatusPill enabled={item.enabled} />}</span>
            <button className="fp-link-button" type="button" onClick={(event) => { event.stopPropagation(); onOpen(item); }}>{t('detail')}</button>
          </div>
        ))}
      </div>
      <Pagination pageNo={page.implementations.pageNo} pageSize={page.implementations.pageSize} total={page.implementations.total} onChange={(next) => onLoad({ ...query, ...next })} />
    </>
  );
}

function MetricContextPanel({ activeTab, metric, implementation, implementations, onDetailMetric, onEditMetric, onDetailImplementation, onEditImplementation, onAddImplementation }) {
  if (activeTab === 'implementation') {
    return <ImplementationContextPanel item={implementation} onDetail={onDetailImplementation} onEdit={onEditImplementation} />;
  }
  return <DefinitionContextPanel metric={metric} implementations={implementations} onDetail={onDetailMetric} onEdit={onEditMetric} onDetailImplementation={onDetailImplementation} onAddImplementation={onAddImplementation} />;
}

function DefinitionContextPanel({ metric, implementations, onDetail, onEdit, onDetailImplementation, onAddImplementation }) {
  if (!metric) {
    return <aside className="fp-metric-side"><EmptySide title={t('metric.noMetricSelected')} /></aside>;
  }
  const mapped = hasMapping(metric);
  return (
    <aside className="fp-metric-side">
      <div className="fp-metric-side__head">
        <div><h2>{metric.metricName}</h2><p>{metric.metricCode}</p></div>
        <StatusPill enabled={metric.enabled} />
      </div>
      <div className="fp-metric-side__actions">
        <button className="fp-button" type="button" onClick={() => onDetail(metric)}>{t('detail')}</button>
        {metric.systemBuiltin ? null : <button className="fp-button" type="button" onClick={() => onEdit(metric)}>{t('edit')}</button>}
      </div>
      <div className="fp-side-section">
        <h3>{t('metric.basicInfo')}</h3>
        <SideInfo label={t('metric.objectType')} value={labelOf(OBJECT_TYPE_OPTIONS, metric.objectType)} />
        <SideInfo label={t('metric.category')} value={labelOf(CATEGORY_OPTIONS, metric.metricCategory)} />
        <SideInfo label="指标类型" value={labelOf(METRIC_KIND_OPTIONS, metric.metricKind || 'RAW')} />
        <SideInfo label={t('metric.unit')} value={metric.valueUnit || '-'} />
        <SideInfo label={t('metric.precision')} value={metric.valuePrecision} />
        {metric.metricKind === 'DERIVED' ? <SideInfo label="源指标" value={metric.sourceMetricCode || '-'} /> : null}
        {metric.metricKind === 'DERIVED' ? <SideInfo label="衍生方式" value={labelOf(DERIVE_TYPE_OPTIONS, metric.deriveType)} /> : null}
      </div>
      <div className={`fp-side-callout ${mapped ? 'fp-side-callout--ok' : 'fp-side-callout--warn'}`}>
        <strong>{mapped ? t('metric.mappingConfigured') : t('metric.mappingMissing')}</strong>
        <span>{mapped ? t('metric.mappingConfiguredDesc') : t('metric.mappingMissingDesc')}</span>
      </div>
      <div className="fp-side-section">
        <div className="fp-side-section__title"><h3>{t('metric.relatedImplementations')} ({implementations.length})</h3>{metric.systemBuiltin ? <Tag success>系统内置</Tag> : <button className="fp-link-button" type="button" onClick={() => onAddImplementation(metric)}>{t('metric.addImplementation')}</button>}</div>
        <div className="fp-side-card-list">
          {implementations.length === 0 ? <EmptySide title={t('metric.noImplementation')} /> : implementations.map((item) => (
            <button className="fp-side-card" key={item.id} type="button" onClick={() => onDetailImplementation(item)}>
              <strong>{item.implementationName}</strong>
              <span>{labelOf(IMPLEMENTATION_TYPE_OPTIONS, item.implementationType)} / {item.executionMode}</span>
              {item.defaultImplementation ? <em>{t('metric.defaultImplementation')}</em> : null}
            </button>
          ))}
        </div>
      </div>
    </aside>
  );
}

function ImplementationContextPanel({ item, onDetail, onEdit }) {
  if (!item) {
    return <aside className="fp-metric-side"><EmptySide title={t('metric.noImplementationSelected')} /></aside>;
  }
  return (
    <aside className="fp-metric-side">
      <div className="fp-metric-side__head">
        <div><h2>{item.implementationName}</h2><p>{item.implementationCode}</p></div>
        <StatusPill enabled={item.enabled} />
      </div>
      <div className="fp-metric-side__actions">
        <button className="fp-button" type="button" onClick={() => onDetail(item)}>{t('detail')}</button>
        {item.systemBuiltin ? null : <button className="fp-button" type="button" onClick={() => onEdit(item)}>{t('edit')}</button>}
      </div>
      <div className="fp-side-section">
        <h3>{t('metric.basicInfo')}</h3>
        <SideInfo label={t('metric.name')} value={item.metricName || '-'} />
        <SideInfo label={t('metric.implType')} value={labelOf(IMPLEMENTATION_TYPE_OPTIONS, item.implementationType)} />
        <SideInfo label={t('metric.executionMode')} value={item.executionMode} />
        <SideInfo label={t('metric.timeout')} value={`${item.timeoutSec}s`} />
        <SideInfo label={t('metric.defaultImplementation')} value={item.defaultImplementation ? t('yes') : t('no')} />
      </div>
      <div className="fp-side-section">
        <h3>{t('metric.implementationConfig')}</h3>
        <SideCode label={t('metric.parameterSchema')} value={item.parameterSchemaJson} />
      </div>
    </aside>
  );
}

function DefinitionDetailPage({ item, implementations, onBack, onEdit, onOpenImplementation, message, onClear }) {
  return (
    <section className="fp-page">
      <button className="fp-link-button fp-back-link" type="button" onClick={onBack}>{t('metric.back')}</button>
      <Toast message={message} onClose={onClear} />
      <div className="fp-detail-hero"><div><span className="fp-kicker">{labelOf(CATEGORY_OPTIONS, item.metricCategory)}{item.systemBuiltin ? ' / 系统内置' : ''}</span><h1>{item.metricName}</h1><p>{item.metricCode}</p></div>{item.systemBuiltin ? null : <button className="fp-button fp-button--primary" type="button" onClick={onEdit}>{t('edit')}</button>}</div>
      <div className="fp-detail-sections">
        <DetailSection title={t('metric.basicInfo')}><Info label={t('metric.objectType')} value={labelOf(OBJECT_TYPE_OPTIONS, item.objectType)} /><Info label="指标类型" value={labelOf(METRIC_KIND_OPTIONS, item.metricKind || 'RAW')} /><Info label="实例维度" value={item.instanceDimension || '-'} /><Info label={t('metric.unit')} value={item.valueUnit || '-'} /><Info label={t('metric.precision')} value={item.valuePrecision} /><Info label={t('metric.status')} value={item.enabled ? t('metric.enabled') : t('metric.disabled')} /><Info label="源指标" value={item.metricKind === 'DERIVED' ? (item.sourceMetricCode || '-') : '-'} /><Info label="衍生方式" value={item.metricKind === 'DERIVED' ? labelOf(DERIVE_TYPE_OPTIONS, item.deriveType) : '-'} /><Info label={t('metric.mapping')} value={item.mappingJson || t('metric.noMapping')} /><Info label={t('description')} value={item.description || '-'} /></DetailSection><DetailSection title={t('metric.parameterSchema')}><CodeBlock label={t('metric.parameterSchema')} value={item.parameterSchemaJson} /></DetailSection>
        <DetailSection title="适用范围"><ApplicabilityRuleList rules={item.applicabilityRules || []} /></DetailSection>
        <DetailSection title={t('metric.relatedImplementations')}><div className="fp-mini-list">{implementations.length === 0 ? <span className="fp-muted-text">{t('empty')}</span> : implementations.map((impl) => <button className="fp-mini-list__item" key={impl.id} type="button" onClick={() => onOpenImplementation(impl)}><strong>{impl.implementationName}</strong><span>{labelOf(IMPLEMENTATION_TYPE_OPTIONS, impl.implementationType)} / {impl.executionMode}</span></button>)}</div></DetailSection>
      </div>
    </section>
  );
}

function ImplementationDetailPage({ item, onBack, onEdit, message, onClear }) {
  return (
    <section className="fp-page">
      <button className="fp-link-button fp-back-link" type="button" onClick={onBack}>{t('metric.back')}</button>
      <Toast message={message} onClose={onClear} />
      <div className="fp-detail-hero"><div><span className="fp-kicker">{labelOf(IMPLEMENTATION_TYPE_OPTIONS, item.implementationType)}{item.systemBuiltin ? ' / 系统内置' : ''}</span><h1>{item.implementationName}</h1><p>{item.implementationCode}</p></div>{item.systemBuiltin ? null : <button className="fp-button fp-button--primary" type="button" onClick={onEdit}>{t('edit')}</button>}</div>
      <div className="fp-detail-sections">
        <DetailSection title={t('metric.basicInfo')}><Info label={t('metric.name')} value={`${item.metricName || '-'} / ${item.metricCode || '-'}`} /><Info label={t('metric.executionMode')} value={item.executionMode} /><Info label={t('metric.defaultImplementation')} value={item.defaultImplementation ? t('yes') : t('no')} /><Info label={t('metric.timeout')} value={`${item.timeoutSec}s`} /><Info label={t('metric.status')} value={item.enabled ? t('metric.enabled') : t('metric.disabled')} /><Info label={t('description')} value={item.description || '-'} /></DetailSection>
        <DetailSection title={t('metric.implementationConfig')}><CodeBlock label={t('metric.parameterSchema')} value={item.parameterSchemaJson} /><CodeBlock label={t('metric.outputSchema')} value={item.outputSchemaJson} /><CodeBlock label={t('metric.scriptContent')} value={item.scriptContent} /></DetailSection>
      </div>
    </section>
  );
}

function DefinitionFormPage({ form, onBack, onSubmit, message, onClear }) {
  const [draft, setDraft] = useState(form);
  const rules = draft.applicabilityRules && draft.applicabilityRules.length
    ? draft.applicabilityRules
    : [defaultApplicabilityRule(draft)];
  function updateRule(index, patch) {
    setDraft({ ...draft, applicabilityRules: rules.map((rule, i) => (i === index ? { ...rule, ...patch } : rule)) });
  }
  function addRule() {
    setDraft({ ...draft, applicabilityRules: rules.concat(defaultApplicabilityRule(draft)) });
  }
  function removeRule(index) {
    const nextRules = rules.filter((_, i) => i !== index);
    setDraft({ ...draft, applicabilityRules: nextRules.length ? nextRules : [defaultApplicabilityRule(draft)] });
  }
  return (
    <FormPage title={draft.id ? t('metric.edit') : t('metric.add')} onBack={onBack} onSubmit={() => onSubmit({ ...draft, applicabilityRules: rules })} message={message} onClear={onClear}>
      <Field label={t('metric.code')} value={draft.metricCode} onChange={(metricCode) => setDraft({ ...draft, metricCode })} />
      <Field label={t('metric.name')} value={draft.metricName} onChange={(metricName) => setDraft({ ...draft, metricName })} />
      <SelectField label={t('metric.category')} value={draft.metricCategory} options={CATEGORY_OPTIONS} onChange={(metricCategory) => setDraft({ ...draft, metricCategory, applicabilityRules: [defaultApplicabilityRule({ ...draft, metricCategory })] })} />
      <SelectField label={t('metric.objectType')} value={draft.objectType} options={OBJECT_TYPE_OPTIONS} onChange={(objectType) => setDraft({ ...draft, objectType })} />
      <Field label={t('metric.unit')} value={draft.valueUnit} onChange={(valueUnit) => setDraft({ ...draft, valueUnit })} />
      <Field label={t('metric.precision')} type="number" value={draft.valuePrecision} onChange={(valuePrecision) => setDraft({ ...draft, valuePrecision: Number(valuePrecision) })} />
      <SelectField label="指标类型" value={draft.metricKind || 'RAW'} options={METRIC_KIND_OPTIONS} onChange={(metricKind) => setDraft({ ...draft, metricKind, deriveType: metricKind === 'DERIVED' ? (draft.deriveType || 'DELTA') : '', sourceMetricCode: metricKind === 'DERIVED' ? draft.sourceMetricCode : '' })} />
      <Field label="实例维度" value={draft.instanceDimension || ''} onChange={(instanceDimension) => setDraft({ ...draft, instanceDimension })} placeholder="partition / executor / worker" />
      {(draft.metricKind || 'RAW') === 'DERIVED' ? <Field label="源指标编码" value={draft.sourceMetricCode || ''} onChange={(sourceMetricCode) => setDraft({ ...draft, sourceMetricCode })} placeholder="例如 kafka.topic.offset" /> : null}
      {(draft.metricKind || 'RAW') === 'DERIVED' ? <SelectField label="衍生方式" value={draft.deriveType || 'DELTA'} options={DERIVE_TYPE_OPTIONS} onChange={(deriveType) => setDraft({ ...draft, deriveType })} /> : null}
      <SelectField label={t('metric.status')} value={draft.enabled ? 'true' : 'false'} options={ENABLED_OPTIONS.slice(1)} onChange={(enabled) => setDraft({ ...draft, enabled: enabled === 'true' })} />
      <ApplicabilityEditor rules={rules} onChange={updateRule} onAdd={addRule} onRemove={removeRule} />
      <TextArea label={t('metric.parameterSchema')} value={draft.parameterSchemaJson} onChange={(parameterSchemaJson) => setDraft({ ...draft, parameterSchemaJson })} placeholder='{"topic":{"required":true,"dataType":"STRING"},"groupId":{"required":true,"dataType":"STRING"}}' />
      <TextArea label={t('metric.mapping')} value={draft.mappingJson} onChange={(mappingJson) => setDraft({ ...draft, mappingJson })} placeholder='{"0":"正常","1":"异常"}' />
      <Field label={t('description')} value={draft.description} onChange={(description) => setDraft({ ...draft, description })} />
    </FormPage>
  );
}

function ApplicabilityEditor({ rules, onChange, onAdd, onRemove }) {
  return (
    <div className="fp-field fp-field--wide fp-applicability-editor">
      <span>适用范围</span>
      <div className="fp-applicability-editor__head">
        <em>决定拓扑节点、拓扑连线、基础设施等上下文中能否选择该指标。</em>
        <button className="fp-button fp-button--small" type="button" onClick={onAdd}>新增范围</button>
      </div>
      {rules.map((rule, index) => (
        <div className="fp-applicability-row" key={`${index}-${rule.scopeType || ""}`}>
          <div className="fp-applicability-row__top">
            <label><span>使用场景</span><SelectBare value={rule.scopeType || ''} options={APPLICABILITY_SCOPE_OPTIONS} onChange={(scopeType) => onChange(index, normalizeRuleForScope({ ...rule, scopeType }))} /></label>
            <label><span>采集锚点</span><SelectBare value={rule.collectAnchor || defaultCollectAnchor(rule.scopeType)} options={collectAnchorOptions(rule.scopeType)} onChange={(collectAnchor) => onChange(index, { collectAnchor })} /></label>
            <button className="fp-link-button fp-link-button--danger" type="button" onClick={() => onRemove(index)}>删除</button>
          </div>
          <div className="fp-applicability-row__fields">
            {rule.scopeType !== 'TOPOLOGY_EDGE' && rule.scopeType !== 'DERIVED' ? (
              <label><span>对象类型</span><SelectBare value={rule.objectType || ''} options={[['', '不限对象']].concat(OBJECT_TYPE_OPTIONS)} onChange={(objectType) => onChange(index, { objectType })} /></label>
            ) : null}
            {rule.scopeType === 'TOPOLOGY_EDGE' ? (
              <>
                <label><span>关系类型</span><SelectBare value={rule.relationType || ''} options={RELATION_TYPE_OPTIONS} onChange={(relationType) => onChange(index, { relationType })} /></label>
                <label><span>源节点类型</span><SelectBare value={rule.sourceObjectType || ''} options={[['', '不限源类型']].concat(OBJECT_TYPE_OPTIONS)} onChange={(sourceObjectType) => onChange(index, { sourceObjectType })} /></label>
                <label><span>目标节点类型</span><SelectBare value={rule.targetObjectType || ''} options={[['', '不限目标类型']].concat(OBJECT_TYPE_OPTIONS)} onChange={(targetObjectType) => onChange(index, { targetObjectType })} /></label>
              </>
            ) : null}
            <label className="is-wide"><span>必需关系参数 JSON</span><input value={rule.requiredParamsJson || ''} placeholder='["topic","groupIdMatcher"]' onChange={(event) => onChange(index, { requiredParamsJson: event.target.value })} /></label>
          </div>
        </div>
      ))}
    </div>
  );
}

function ApplicabilityRuleList({ rules }) {
  if (!rules.length) {
    return <span className="fp-muted-text">未配置，系统将按指标分类和对象类型兜底匹配。</span>;
  }
  return (
    <div className="fp-mini-list">
      {rules.map((rule) => (
        <div className="fp-mini-list__item" key={rule.id || `${rule.scopeType}-${rule.objectType}-${rule.relationType}`}>
          <strong>{labelOf(APPLICABILITY_SCOPE_OPTIONS, rule.scopeType)} / {labelOf(OBJECT_TYPE_OPTIONS, rule.objectType) || '不限对象'}</strong>
          <span>
            关系：{labelOf(RELATION_TYPE_OPTIONS, rule.relationType) || '不限'}，
            源：{labelOf(OBJECT_TYPE_OPTIONS, rule.sourceObjectType) || '不限'}，
            目标：{labelOf(OBJECT_TYPE_OPTIONS, rule.targetObjectType) || '不限'}，
            采集：{labelOf(COLLECT_ANCHOR_OPTIONS, rule.collectAnchor) || '-'}
          </span>
        </div>
      ))}
    </div>
  );
}

function defaultApplicabilityRule(metric) {
  const category = metric.metricCategory || 'INFRASTRUCTURE';
  if (category === 'TOPOLOGY_EDGE') {
    return { scopeType: 'TOPOLOGY_EDGE', objectType: 'TOPOLOGY_EDGE', relationType: '', sourceObjectType: '', targetObjectType: '', collectAnchor: 'SOURCE_OBJECT', requiredParamsJson: '', enabled: true };
  }
  if (category === 'TOPOLOGY_NODE') {
    return { scopeType: 'TOPOLOGY_NODE', objectType: metric.objectType || '', relationType: '', sourceObjectType: '', targetObjectType: '', collectAnchor: 'CURRENT_OBJECT', requiredParamsJson: '', enabled: true };
  }
  return { scopeType: category, objectType: metric.objectType || '', relationType: '', sourceObjectType: '', targetObjectType: '', collectAnchor: 'CURRENT_OBJECT', requiredParamsJson: '', enabled: true };
}

function normalizeRuleForScope(rule) {
  if (rule.scopeType === 'TOPOLOGY_EDGE') {
    return { ...rule, objectType: 'TOPOLOGY_EDGE', collectAnchor: rule.collectAnchor || 'SOURCE_OBJECT' };
  }
  if (rule.scopeType === 'DERIVED') {
    return { ...rule, objectType: '', relationType: '', sourceObjectType: '', targetObjectType: '', collectAnchor: 'TOPOLOGY_ELEMENT' };
  }
  return { ...rule, relationType: '', sourceObjectType: '', targetObjectType: '', collectAnchor: rule.collectAnchor || 'CURRENT_OBJECT' };
}

function defaultCollectAnchor(scopeType) {
  if (scopeType === 'TOPOLOGY_EDGE') return 'SOURCE_OBJECT';
  if (scopeType === 'DERIVED') return 'TOPOLOGY_ELEMENT';
  return 'CURRENT_OBJECT';
}

function collectAnchorOptions(scopeType) {
  if (scopeType === 'TOPOLOGY_EDGE') {
    return COLLECT_ANCHOR_OPTIONS.filter(([value]) => ['SOURCE_OBJECT', 'TARGET_OBJECT', 'RELATION_OBJECT', 'TOPOLOGY_ELEMENT', 'CUSTOM'].includes(value));
  }
  if (scopeType === 'DERIVED') {
    return COLLECT_ANCHOR_OPTIONS.filter(([value]) => ['TOPOLOGY_ELEMENT', 'CUSTOM'].includes(value));
  }
  return COLLECT_ANCHOR_OPTIONS.filter(([value]) => ['CURRENT_OBJECT', 'CUSTOM'].includes(value));
}

function ImplementationFormPage({ form, metrics, onBack, onSubmit, message, onClear }) {
  const [draft, setDraft] = useState(form);
  return (
    <FormPage title={draft.id ? t('metric.editImplementation') : t('metric.addImplementation')} onBack={onBack} onSubmit={() => onSubmit({ ...draft, outputSchemaJson: draft.outputSchemaJson || '{"value":"number","timestamp":"number","message":"string"}' })} message={message} onClear={onClear}>
      <SelectField label={t('metric.name')} value={draft.metricDefinitionId} options={metrics.map((item) => [item.id, `${item.metricName} / ${item.metricCode}`])} onChange={(metricDefinitionId) => setDraft({ ...draft, metricDefinitionId })} />
      <Field label={t('metric.implementationCode')} value={draft.implementationCode} onChange={(implementationCode) => setDraft({ ...draft, implementationCode })} />
      <Field label={t('metric.implementationName')} value={draft.implementationName} onChange={(implementationName) => setDraft({ ...draft, implementationName })} />
      <SelectField label={t('metric.implType')} value={draft.implementationType} options={IMPLEMENTATION_TYPE_OPTIONS} onChange={(implementationType) => setDraft({ ...draft, implementationType, executionMode: defaultExecutionMode(implementationType) })} />
      <SelectField label={t('metric.executionMode')} value={draft.executionMode} options={EXECUTION_OPTIONS} onChange={(executionMode) => setDraft({ ...draft, executionMode })} />
      <SelectField label={t('metric.defaultImplementation')} value={draft.defaultImplementation ? 'true' : 'false'} options={ENABLED_OPTIONS.slice(1)} onChange={(defaultImplementation) => setDraft({ ...draft, defaultImplementation: defaultImplementation === 'true' })} />
      <Field label={t('metric.timeout')} type="number" value={draft.timeoutSec} onChange={(timeoutSec) => setDraft({ ...draft, timeoutSec: Number(timeoutSec) })} />
      <Field label={t('metric.builtInCollector')} value={draft.builtInCollector} onChange={(builtInCollector) => setDraft({ ...draft, builtInCollector })} />
      <HelpTextArea label={t('metric.parameterSchema')} value={draft.parameterSchemaJson} onChange={(parameterSchemaJson) => setDraft({ ...draft, parameterSchemaJson })} placeholder={PARAMETER_SCHEMA_EXAMPLE} helpTitle="入参规范样例" helpText={PARAMETER_SCHEMA_EXAMPLE} />
      <HelpTextArea label={t('metric.scriptContent')} value={draft.scriptContent} onChange={(scriptContent) => setDraft({ ...draft, scriptContent })} placeholder={SCRIPT_CONTENT_EXAMPLE} helpTitle="脚本输出样例" helpText={SCRIPT_CONTENT_EXAMPLE} />
      <ReadOnlyExample title={t('metric.outputSchema')} value={OUTPUT_SCHEMA_HINT} />
    </FormPage>
  );
}
function FormPage({ title, children, onBack, onSubmit, message, onClear }) {
  return <section className="fp-page"><button className="fp-link-button fp-back-link" type="button" onClick={onBack}>{t('metric.back')}</button><Toast message={message} onClose={onClear} /><div className="fp-form-header"><div><span className="fp-kicker">{t('menuMetricCenter')}</span><h1>{title}</h1><p>{t('metric.formDesc')}</p></div><div className="fp-actions"><button className="fp-button" type="button" onClick={onBack}>{t('cancel')}</button><button className="fp-button fp-button--primary" type="button" onClick={onSubmit}>{t('save')}</button></div></div><section className="fp-card"><div className="fp-form fp-form--page">{children}</div></section></section>;
}

function SideInfo({ label, value }) { return <div className="fp-side-info"><span>{label}</span><strong>{value || '-'}</strong></div>; }
function SideCode({ label, value }) { return <div className="fp-side-code"><span>{label}</span><pre>{value || '-'}</pre></div>; }
function EmptySide({ title }) { return <div className="fp-side-empty">{title}</div>; }
function Tag({ children, muted, success }) { return <span className={`fp-mini-tag ${muted ? 'is-muted' : ''} ${success ? 'is-success' : ''}`}>{children}</span>; }
function MappingPill({ mapped }) { return <span className={`fp-mapping-pill ${mapped ? 'is-ok' : 'is-warn'}`}>{mapped ? t('metric.mappingConfigured') : t('metric.mappingMissing')}</span>; }
function DetailSection({ title, children }) { return <section className="fp-detail-section"><h2>{title}</h2><div className="fp-info-grid">{children}</div></section>; }
function Info({ label, value }) { return <div className="fp-info-box"><span>{label}</span><strong><span>{value || '-'}</span></strong></div>; }
function CodeBlock({ label, value }) { return <div className="fp-code-box"><span>{label}</span><pre>{value || '-'}</pre></div>; }
function ReadOnlyExample({ title, value }) { return <div className="fp-field fp-field--wide fp-code-box"><span>{title}</span><pre>{value}</pre></div>; }
function SearchInput({ value, placeholder, onChange, onSearch }) { return <div className="fp-inline-search"><SearchOutlined /><input value={value} placeholder={placeholder} onChange={(event) => onChange(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') onSearch(); }} /></div>; }
function Field({ label, value, onChange, type = 'text' }) { return <label className="fp-field"><span>{label}</span><input type={type} value={value || ''} onChange={(event) => onChange(event.target.value)} autoComplete="off" /></label>; }
function TextArea({ label, value, onChange, placeholder }) { return <label className="fp-field fp-field--wide"><span>{label}</span><textarea value={value || ''} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} /></label>; }
function HelpTextArea({ label, value, onChange, placeholder, helpTitle, helpText }) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  async function copyExample() {
    if (navigator.clipboard) {
      await navigator.clipboard.writeText(helpText);
    }
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1500);
  }
  return (
    <label className="fp-field fp-field--wide fp-field--with-help">
      <span className="fp-field-help-title">
        {label}
        <button type="button" className="fp-help-dot" onClick={() => setOpen(!open)}>?</button>
        <button type="button" className="fp-copy-example" onClick={copyExample}>{copied ? '已复制' : '复制样例'}</button>
      </span>
      {open ? <pre className="fp-inline-example" title={helpTitle}>{helpText}</pre> : null}
      <textarea value={value || ''} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} />
    </label>
  );
}
function SelectField({ label, value, options, onChange }) { return <label className="fp-field"><span>{label}</span><select value={value || ''} onChange={(event) => onChange(event.target.value)}>{options.map(([optionValue, label]) => <option key={optionValue} value={optionValue}>{formatLabel(label)}</option>)}</select></label>; }
function SelectBare({ value, options, onChange }) { return <select className="fp-native-select" value={value || ''} onChange={(event) => onChange(event.target.value)}>{options.map(([optionValue, label]) => <option key={optionValue} value={optionValue}>{formatLabel(label)}</option>)}</select>; }
function StatusPill({ enabled }) { return <span className={`fp-status-pill ${enabled ? 'fp-status-pill--normal' : ''}`}>{enabled ? t('metric.enabled') : t('metric.disabled')}</span>; }
function hasMapping(metric) { return Boolean(metric && metric.mappingJson && metric.mappingJson.trim && metric.mappingJson.trim().length > 0); }
function labelOf(options, value) { const item = options.find(([optionValue]) => optionValue === value); return item ? formatLabel(item[1]) : value || '-'; }
function readTopologyMetricPrefill() {
  const raw = window.sessionStorage.getItem('flowpulse.metric.prefill');
  if (!raw) return null;
  window.sessionStorage.removeItem('flowpulse.metric.prefill');
  try {
    return JSON.parse(raw);
  } catch (error) {
    return null;
  }
}
function formatLabel(label) { return label && label.indexOf('.') > 0 ? t(label) : label; }
function defaultExecutionMode(type) { if (type === 'SHELL' || type === 'PYTHON') return 'SSH'; if (type === 'EXPRESSION') return 'EXPRESSION'; return 'SERVER'; }
