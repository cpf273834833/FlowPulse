import React, { useEffect, useMemo, useState } from 'react';
import { logicalObjectApi } from '../../api/logicalObjectApi';
import { environmentRegionApi } from '../../api/environmentRegionApi';
import { infrastructureApi } from '../../api/infrastructureApi';
import ConfirmDialog from '../../components/ConfirmDialog';
import Pagination from '../../components/Pagination';
import SelectControl from '../../components/SelectControl';
import { StatCards } from '../../components/PageChrome';
import Toast from '../../components/Toast';
import './LogicalObjectPage.css';

const DEFAULT_QUERY = { pageNo: 1, pageSize: 10, keyword: '', objectType: '', sourceType: '', enabled: '' };
const DEFAULT_FORM = {
  objectCode: '',
  objectName: '',
  objectType: 'SPARK_LOGICAL_JOB',
  envId: '',
  regionId: '',
  sourceType: 'SPARK',
  sourceInfrastructureId: '',
  matchField: 'name',
  matchType: 'REGEX',
  matchPattern: '',
  timeExtractRegex: '',
  timeFormat: '',
  timeReference: 'NONE',
  instanceFilterJson: '{\n  "activeOnly": true,\n  "seenWithinSeconds": 600\n}',
  aggregationJson: '{\n  "logical.running": "count(status == RUNNING) > 0",\n  "logical.instance.count": "count(status == RUNNING)"\n}',
  outputMetricJson: '[\n  {\n    "metricCode": "logical.running",\n    "metricName": "逻辑运行状态",\n    "expression": "count(status == RUNNING) > 0",\n    "unit": "bool"\n  },\n  {\n    "metricCode": "logical.instance.count",\n    "metricName": "实例数",\n    "expression": "count(status == RUNNING)",\n    "unit": "个"\n  }\n]',
  enabled: true,
  description: '',
};

const OBJECT_TYPES = [
  ['SPARK_LOGICAL_JOB', 'Spark 逻辑作业'],
  ['KAFKA_LOGICAL_CONSUMER_GROUP', 'Kafka 逻辑消费组'],
  ['ES_LOGICAL_INDEX', 'ES 逻辑索引'],
  ['APPLICATION_LOGICAL_SERVICE', '应用逻辑服务'],
  ['CUSTOM_LOGICAL_OBJECT', '自定义逻辑对象'],
];
const SOURCE_TYPES = [['SPARK', 'Spark'], ['KAFKA', 'Kafka'], ['ELASTICSEARCH', 'Elasticsearch'], ['APPLICATION', '应用'], ['MANUAL', '手工']];
const MATCH_TYPES = [['EXACT', '精确'], ['PREFIX', '前缀'], ['REGEX', '正则'], ['EXPRESSION', '表达式']];

const AGGREGATION_TEMPLATES = {
  SPARK_LOGICAL_JOB: {
    name: 'Spark 作业运行模板',
    description: '只保留最近出现的活跃 Spark application，聚合为是否运行、活跃实例数。',
    filter: {
      activeOnly: true,
      seenWithinSeconds: 1800,
    },
    outputMetrics: [
      { metricCode: 'logical.running', metricName: '逻辑作业运行状态', expression: 'count(status == RUNNING) > 0', unit: 'bool' },
      { metricCode: 'logical.active.instance.count', metricName: '活跃实例数', expression: 'count(status == RUNNING)', unit: '个' },
    ],
  },
  KAFKA_LOGICAL_CONSUMER_GROUP: {
    name: 'Kafka 消费组模板',
    description: '按 groupId 规则归并多个物理消费组，输出消费组数量和总积压。',
    filter: {
      activeOnly: true,
      seenWithinSeconds: 1800,
    },
    outputMetrics: [
      { metricCode: 'logical.consumer.group.count', metricName: '活跃消费组数', expression: 'count(status == ACTIVE)', unit: '个' },
      { metricCode: 'logical.consumer.total.lag', metricName: '总积压', expression: 'sum(lag)', unit: '条' },
    ],
  },
  ES_LOGICAL_INDEX: {
    name: 'ES 日期索引模板',
    description: '按索引名称中的日期归并每日索引，输出打开索引数和最新索引时间。',
    filter: {
      latestOnly: false,
      seenWithinSeconds: 86400,
    },
    outputMetrics: [
      { metricCode: 'logical.index.open.count', metricName: '打开索引数', expression: 'count(status == open)', unit: '个' },
      { metricCode: 'logical.index.latest.time', metricName: '最新索引时间', expression: 'max(time)', unit: 'ms' },
    ],
  },
  APPLICATION_LOGICAL_SERVICE: {
    name: '应用实例模板',
    description: '归并同一个应用服务下的运行实例，输出在线实例数和是否可用。',
    filter: {
      activeOnly: true,
      seenWithinSeconds: 600,
    },
    outputMetrics: [
      { metricCode: 'logical.service.online.count', metricName: '在线实例数', expression: 'count(status == RUNNING)', unit: '个' },
      { metricCode: 'logical.service.available', metricName: '服务可用', expression: 'count(status == RUNNING) > 0', unit: 'bool' },
    ],
  },
};

export default function LogicalObjectPage() {
  const [query, setQuery] = useState(DEFAULT_QUERY);
  const [page, setPage] = useState({ records: [], total: 0, pageNo: 1, pageSize: 10 });
  const [envs, setEnvs] = useState([]);
  const [regions, setRegions] = useState([]);
  const [infrastructures, setInfrastructures] = useState([]);
  const [selected, setSelected] = useState(null);
  const [instances, setInstances] = useState({ records: [], total: 0, pageNo: 1, pageSize: 10 });
  const [instanceQuery, setInstanceQuery] = useState({ pageNo: 1, pageSize: 10, keyword: '' });
  const [mode, setMode] = useState('list');
  const [editingId, setEditingId] = useState('');
  const [form, setForm] = useState(DEFAULT_FORM);
  const [toast, setToast] = useState(null);
  const [confirm, setConfirm] = useState(null);
  const [resolvingId, setResolvingId] = useState('');

  const regionOptions = useMemo(() => regions.filter((region) => !form.envId || region.envId === form.envId), [regions, form.envId]);
  const sourceInfrastructures = useMemo(() => infrastructures.filter((item) => !form.sourceType || item.type === form.sourceType), [infrastructures, form.sourceType]);

  useEffect(() => {
    loadEnvironments();
    loadInfrastructures();
    loadPage(query);
  }, []);

  async function loadEnvironments() {
    const response = await environmentRegionApi.page();
    setEnvs(response.environments || []);
    setRegions(response.regions || []);
  }

  async function loadInfrastructures() {
    const response = await infrastructureApi.page({ pageNo: 1, pageSize: 500 });
    setInfrastructures(response.infrastructures?.records || []);
  }

  async function loadPage(nextQuery = query) {
    const response = await logicalObjectApi.page(nextQuery);
    setPage(response || { records: [], total: 0, pageNo: nextQuery.pageNo, pageSize: nextQuery.pageSize });
    setQuery(nextQuery);
    if (!selected && response?.records?.length) {
      setSelected(response.records[0]);
      loadInstances(response.records[0].id, instanceQuery);
    }
  }

  async function loadInstances(id = selected?.id, nextQuery = instanceQuery) {
    if (!id) return;
    const response = await logicalObjectApi.instances(id, nextQuery);
    setInstances(response || { records: [], total: 0, pageNo: nextQuery.pageNo, pageSize: nextQuery.pageSize });
    setInstanceQuery(nextQuery);
  }

  function openCreate() {
    setEditingId('');
    setForm({ ...DEFAULT_FORM, envId: envs[0]?.id || '' });
    setMode('edit');
  }

  async function openEdit(item) {
    const detail = await logicalObjectApi.detail(item.id);
    setEditingId(item.id);
    setForm({ ...DEFAULT_FORM, ...detail });
    setMode('edit');
  }

  async function selectItem(item) {
    const detail = await logicalObjectApi.detail(item.id);
    setSelected(detail);
    await loadInstances(item.id, { pageNo: 1, pageSize: instanceQuery.pageSize, keyword: '' });
  }

  async function save() {
    if (!form.objectCode || !form.objectName || !form.envId) {
      setToast({ type: 'warning', title: '请补全必填信息', message: '编码、名称和所属环境不能为空。' });
      return;
    }
    try {
      JSON.parse(form.instanceFilterJson || '{}');
      const metrics = normalizeOutputMetricDefinitions(parseJson(form.outputMetricJson, []), parseJson(form.aggregationJson, {}));
      if (metrics.some((metric) => !metric.metricCode || !metric.expression)) {
        setToast({ type: 'warning', title: '输出指标配置不完整', message: '每个输出指标都必须配置指标编码和聚合表达式。' });
        return;
      }
    } catch (error) {
      setToast({ type: 'error', title: 'JSON 配置不合法', message: error.message });
      return;
    }
    const metricDefinitions = normalizeOutputMetricDefinitions(parseJson(form.outputMetricJson, []), parseJson(form.aggregationJson, {}));
    const payload = {
      ...form,
      aggregationJson: stringifyJson(metricsToAggregation(metricDefinitions)),
      outputMetricJson: stringifyJson(metricDefinitions),
      enabled: form.enabled !== false,
    };
    const saved = editingId ? await logicalObjectApi.update(editingId, payload) : await logicalObjectApi.create(payload);
    setToast({ type: 'success', title: editingId ? '逻辑对象已更新' : '逻辑对象已创建', message: saved.objectName });
    setSelected(saved);
    setMode('list');
    await loadPage(query);
    await loadInstances(saved.id, instanceQuery);
  }

  async function resolveSelected() {
    if (!selected) return;
    try {
      const resolved = await logicalObjectApi.resolve(selected.id);
      setSelected(resolved);
      setToast({ type: 'success', title: '实例解析完成', message: `${resolved.objectName} 当前匹配 ${resolved.instanceCount || 0} 个实例。` });
      await loadInstances(selected.id, { pageNo: 1, pageSize: instanceQuery.pageSize, keyword: '' });
      await loadPage(query);
    } catch (error) {
      setToast({ type: 'error', title: '实例解析失败', message: error.message });
    }
  }

  async function resolveItem(item) {
    if (!item || resolvingId) return;
    setResolvingId(item.id);
    try {
      const resolved = await logicalObjectApi.resolve(item.id);
      setSelected(resolved);
      setToast({ type: 'success', title: '实例解析完成', message: `${resolved.objectName} 当前匹配 ${resolved.instanceCount || 0} 个实例。` });
      await loadInstances(item.id, { pageNo: 1, pageSize: instanceQuery.pageSize, keyword: '' });
      await loadPage(query);
    } catch (error) {
      setToast({ type: 'error', title: '实例解析失败', message: error.message });
    } finally {
      setResolvingId('');
    }
  }

  function applyAggregationTemplate(type = form.objectType) {
    const template = AGGREGATION_TEMPLATES[type];
    if (!template) {
      setToast({ type: 'info', title: '暂无内置模板', message: '自定义逻辑对象需要在高级配置中维护过滤与聚合规则。' });
      return;
    }
    setForm((current) => ({
      ...current,
      instanceFilterJson: stringifyJson(template.filter),
      aggregationJson: stringifyJson(metricsToAggregation(template.outputMetrics)),
      outputMetricJson: stringifyJson(template.outputMetrics),
    }));
    setToast({ type: 'success', title: '已应用推荐模板', message: template.name });
  }

  function requestDelete(item) {
    setConfirm({
      title: '确认删除逻辑对象',
      content: `删除后拓扑中已绑定的节点将失去稳定对象来源：${item.objectName}`,
      onCancel: () => setConfirm(null),
      onConfirm: async () => {
        await logicalObjectApi.delete(item.id);
        setConfirm(null);
        setSelected(null);
        setToast({ type: 'success', title: '逻辑对象已删除', message: item.objectName });
        loadPage(query);
      },
    });
  }

  if (mode === 'edit') {
    return (
      <div className="fp-page fp-logical-page">
        <button className="fp-link-button fp-back-link" type="button" onClick={() => setMode('list')}>返回逻辑对象</button>
        <div className="fp-form-header">
          <div>
            <span className="fp-kicker">{editingId ? '编辑逻辑对象' : '新增逻辑对象'}</span>
            <h1>{form.objectName || form.objectCode || '未命名逻辑对象'}</h1>
            <p>把动态 Spark application、Kafka groupId 或应用实例归并为稳定监控对象。</p>
          </div>
          <div className="fp-actions">
            <button className="fp-button" type="button" onClick={() => setMode('list')}>取消</button>
            <button className="fp-button fp-button--primary" type="button" onClick={save}>保存</button>
          </div>
        </div>
        <section className="fp-logical-form-grid">
          <FormGroup title="基本信息" desc="稳定身份，拓扑绑定这个对象，而不是绑定运行实例。">
            <Field label="对象编码 *" value={form.objectCode} disabled={Boolean(editingId)} onChange={(objectCode) => setForm({ ...form, objectCode })} />
            <Field label="对象名称 *" value={form.objectName} onChange={(objectName) => setForm({ ...form, objectName })} />
            <SelectField label="对象类型" value={form.objectType} options={OBJECT_TYPES} onChange={(objectType) => setForm({ ...form, objectType, sourceType: defaultSourceType(objectType) })} />
            <SelectField label="所属环境 *" value={form.envId} options={envs.map((env) => [env.id, env.envName])} onChange={(envId) => setForm({ ...form, envId, regionId: '' })} />
            <SelectField label="所属区域" value={form.regionId} options={[['', '不限定区域']].concat(regionOptions.map((region) => [region.id, region.regionName]))} onChange={(regionId) => setForm({ ...form, regionId })} />
            <SelectField label="启用状态" value={String(form.enabled)} options={[['true', '启用'], ['false', '停用']]} onChange={(enabled) => setForm({ ...form, enabled: enabled === 'true' })} />
          </FormGroup>
          <FormGroup title="实例解析" desc="定义如何从 Spark、Kafka 或应用环境中找到属于该对象的物理实例。">
            <SelectField label="来源类型" value={form.sourceType} options={SOURCE_TYPES} onChange={(sourceType) => setForm({ ...form, sourceType, sourceInfrastructureId: '' })} />
            <SelectField label="来源基础设施" value={form.sourceInfrastructureId} options={[['', '不限定实例来源']].concat(sourceInfrastructures.map((item) => [item.id, `${item.name} / ${item.code}`]))} onChange={(sourceInfrastructureId) => setForm({ ...form, sourceInfrastructureId })} />
            <Field label="匹配字段" value={form.matchField} onChange={(matchField) => setForm({ ...form, matchField })} hint="Spark 可用 name/id，Kafka 可用 groupId。" />
            <SelectField label="匹配方式" value={form.matchType} options={MATCH_TYPES} onChange={(matchType) => setForm({ ...form, matchType })} />
            <TextArea label="匹配表达式" value={form.matchPattern} onChange={(matchPattern) => setForm({ ...form, matchPattern })} placeholder="例如 ^order-etl-\\d{14}$ 或 groupId.startsWith('resource-change-')" />
            <Field label="时间提取正则" value={form.timeExtractRegex} onChange={(timeExtractRegex) => setForm({ ...form, timeExtractRegex })} hint="用于从动态名称或 groupId 中提取时间片段。" />
            <Field label="时间格式" value={form.timeFormat} onChange={(timeFormat) => setForm({ ...form, timeFormat })} hint="例如 yyyyMMddHHmmss。" />
          </FormGroup>
          <FormGroup title="过滤与聚合" desc="先选择推荐模板理解业务含义，再按需展开高级 JSON。大多数场景不需要从零编写。">
            <AggregationDesigner
              form={form}
              onApplyTemplate={applyAggregationTemplate}
              onChange={(field, value) => setForm((current) => ({ ...current, [field]: value }))}
            />
            <TextArea label="描述" value={form.description} onChange={(description) => setForm({ ...form, description })} />
          </FormGroup>
        </section>
        {toast ? <Toast {...toast} onClose={() => setToast(null)} /> : null}
      </div>
    );
  }

  return (
    <div className="fp-page fp-logical-page">
      <header className="fp-page__header">
        <div>
          <h1>逻辑对象</h1>
          <p>统一维护 Spark 逻辑作业、Kafka 逻辑消费组等稳定监控对象，解决实例名称和 ID 动态变化的问题。</p>
        </div>
        <button className="fp-button fp-button--primary" type="button" onClick={openCreate}>新增逻辑对象</button>
      </header>
      <StatCards stats={logicalObjectStats(page.records, page.total)} />
      <section className="fp-logical-layout fp-logical-layout--single">
        <main className="fp-card fp-logical-main">
          <div className="fp-filter-row fp-filter-row--logical">
            <label className="fp-inline-search"><span>⌕</span><input value={query.keyword} placeholder="搜索名称、编码、匹配表达式" onChange={(event) => setQuery({ ...query, keyword: event.target.value })} onKeyDown={(event) => event.key === 'Enter' && loadPage({ ...query, pageNo: 1 })} /></label>
            <SelectBare value={query.objectType} options={[['', '全部类型']].concat(OBJECT_TYPES)} onChange={(objectType) => loadPage({ ...query, pageNo: 1, objectType })} />
            <SelectBare value={query.sourceType} options={[['', '全部来源']].concat(SOURCE_TYPES)} onChange={(sourceType) => loadPage({ ...query, pageNo: 1, sourceType })} />
            <button className="fp-button" type="button" onClick={() => loadPage({ ...query, pageNo: 1 })}>筛选</button>
          </div>
          <div className="fp-logical-card-grid">
            {page.records.map((item) => (
              <article className={`fp-logical-card ${selected?.id === item.id ? 'is-active' : ''}`} key={item.id}>
                <button type="button" onClick={() => openEdit(item)}>
                  <div><strong>{item.objectName}</strong><span>{item.objectCode}</span></div>
                  <em>{labelOf(OBJECT_TYPES, item.objectType)}</em>
                  <p>{item.matchPattern || '未配置匹配表达式'}</p>
                  <div className="fp-logical-meta"><span>实例 {item.instanceCount || 0}</span><span>活跃 {item.activeInstanceCount || 0}</span><span>{item.enabled ? '启用' : '停用'}</span></div>
                </button>
                <div className="fp-actions">
                  <button className="fp-link-button" type="button" disabled={resolvingId === item.id} onClick={() => resolveItem(item)}>{resolvingId === item.id ? '解析中...' : '解析实例'}</button>
                  <button className="fp-link-button" type="button" onClick={() => openEdit(item)}>编辑</button>
                  <button className="fp-link-button fp-link-button--danger" type="button" onClick={() => requestDelete(item)}>删除</button>
                </div>
              </article>
            ))}
            {page.records.length === 0 ? <div className="fp-empty">暂无逻辑对象</div> : null}
          </div>
          <Pagination pageNo={page.pageNo} pageSize={page.pageSize} total={page.total} onChange={(next) => loadPage({ ...query, ...next })} />
        </main>
      </section>
      {confirm ? <ConfirmDialog {...confirm} /> : null}
      {toast ? <Toast {...toast} onClose={() => setToast(null)} /> : null}
    </div>
  );
}

function AggregationDesigner({ form, onApplyTemplate, onChange }) {
  const template = AGGREGATION_TEMPLATES[form.objectType];
  const filter = parseJson(form.instanceFilterJson, {});
  const aggregation = parseJson(form.aggregationJson, {});
  const outputMetrics = parseJson(form.outputMetricJson, []);
  const outputList = normalizeOutputMetricDefinitions(outputMetrics, aggregation);
  function changeMetrics(nextMetrics) {
    onChange('outputMetricJson', stringifyJson(nextMetrics));
    onChange('aggregationJson', stringifyJson(metricsToAggregation(nextMetrics)));
  }
  return (
    <div className="fp-logical-aggregation fp-field--wide">
      <div className="fp-logical-guide">
        <div>
          <span className="fp-kicker">推荐配置</span>
          <h3>{template ? template.name : '自定义聚合配置'}</h3>
          <p>{template ? template.description : '自定义对象没有内置规则，可以在高级配置中维护过滤条件、聚合策略和输出指标。'}</p>
        </div>
        <button className="fp-button fp-button--primary" type="button" onClick={() => onApplyTemplate(form.objectType)} disabled={!template}>
          套用推荐模板
        </button>
      </div>

      <div className="fp-logical-rule-grid">
        <RuleExplain
          title="实例过滤"
          items={[
            ['只看活跃实例', filter.activeOnly === true ? '是' : '否'],
            ['只保留最新实例', filter.latestOnly === true ? '是' : '否'],
            ['最近出现窗口', filter.seenWithinSeconds ? `${filter.seenWithinSeconds}s` : '不限制'],
          ]}
          help="决定哪些物理实例会被纳入逻辑对象。例如 Spark 重启后只看最近运行实例，ES 日期索引则可以保留多个日期索引。"
        />
        <RuleExplain
          title="输出指标与表达式"
          items={outputList.length ? outputList.map((metric) => [metric.metricCode, metric.expression]) : [['未配置', '不会生成逻辑指标']]}
          help="每个输出指标直接绑定自己的聚合表达式，不再通过两个 JSON 的 key 互相猜。"
        />
        <RuleExplain
          title="指标展示"
          items={outputList.length ? outputList.map((metric) => [metric.metricName || metric.metricCode, metric.unit || '-']) : [['未配置', '拓扑无法展示衍生指标']]}
          help="指标编码供拓扑、阈值和告警引用；指标名称和单位用于页面展示。"
        />
      </div>

      <MetricMappingEditor metrics={outputList} onChange={changeMetrics} />

      <div className="fp-logical-expression-help">
        <strong>表达式速记</strong>
        <span><code>count(condition)</code> 统计满足条件的实例数</span>
        <span><code>sum(field)</code> 对数值字段求和</span>
        <span><code>max(time)</code> 取最新时间</span>
        <span><code>status == RUNNING</code> 判断实例状态</span>
      </div>

    </div>
  );
}

function MetricMappingEditor({ metrics, onChange }) {
  function update(index, field, value) {
    onChange(metrics.map((metric, currentIndex) => (currentIndex === index ? { ...metric, [field]: value } : metric)));
  }
  function addMetric() {
    onChange(metrics.concat([{ metricCode: '', metricName: '', expression: '', unit: '' }]));
  }
  function removeMetric(index) {
    onChange(metrics.filter((_, currentIndex) => currentIndex !== index));
  }
  return (
    <section className="fp-logical-metric-map">
      <div className="fp-logical-metric-map__head">
        <div>
          <h4>输出指标映射</h4>
          <p>这里才是正式关系：每一行就是一个对外指标，表达式就是它的取值来源。</p>
        </div>
        <button className="fp-button" type="button" onClick={addMetric}>新增指标</button>
      </div>
      <div className="fp-logical-metric-map__table">
        <div className="fp-logical-metric-map__row is-head">
          <span>指标编码</span>
          <span>指标名称</span>
          <span>聚合表达式</span>
          <span>单位</span>
          <span>操作</span>
        </div>
        {metrics.map((metric, index) => (
          <div className="fp-logical-metric-map__row" key={`${metric.metricCode}-${index}`}>
            <input value={metric.metricCode || ''} placeholder="logical.xxx" onChange={(event) => update(index, 'metricCode', event.target.value)} />
            <input value={metric.metricName || ''} placeholder="页面展示名称" onChange={(event) => update(index, 'metricName', event.target.value)} />
            <input value={metric.expression || ''} placeholder="count(status == RUNNING)" onChange={(event) => update(index, 'expression', event.target.value)} />
            <input value={metric.unit || ''} placeholder="个/ms/bool" onChange={(event) => update(index, 'unit', event.target.value)} />
            <button className="fp-link-button fp-link-button--danger" type="button" onClick={() => removeMetric(index)}>删除</button>
          </div>
        ))}
        {metrics.length === 0 ? <div className="fp-empty">暂无输出指标，请套用模板或新增指标。</div> : null}
      </div>
    </section>
  );
}

function ReadOnlyCode({ label, value }) {
  return <label className="fp-field fp-field--wide fp-code-field"><span>{label}</span><textarea value={value || ''} readOnly /></label>;
}

function RuleExplain({ title, items, help }) {
  return (
    <section className="fp-logical-rule-card">
      <h4>{title}</h4>
      <p>{help}</p>
      <div>
        {items.map(([label, value]) => (
          <span key={`${label}-${value}`}>
            <em>{label}</em>
            <strong>{String(value)}</strong>
          </span>
        ))}
      </div>
    </section>
  );
}

function FormGroup({ title, desc, children }) {
  return <section className="fp-card fp-logical-form-group"><h2>{title}</h2><p>{desc}</p><div className="fp-form-grid">{children}</div></section>;
}

function Field({ label, value, onChange, hint = '', disabled = false }) {
  return <label className="fp-field"><span>{label}</span><input value={value || ''} disabled={disabled} onChange={(event) => onChange(event.target.value)} autoComplete="off" />{hint ? <em>{hint}</em> : null}</label>;
}

function SelectField({ label, value, options, onChange }) {
  return <label className="fp-field"><span>{label}</span><select value={value || ''} onChange={(event) => onChange(event.target.value)}>{options.map(([optionValue, labelText]) => <option value={optionValue} key={optionValue}>{labelText}</option>)}</select></label>;
}

function SelectBare({ value, options, onChange }) {
  return <SelectControl className="fp-select-bare" value={value || ''} options={options} onChange={onChange} />;
}

function TextArea({ label, value, onChange, placeholder = '' }) {
  return <label className="fp-field fp-field--wide"><span>{label}</span><textarea value={value || ''} placeholder={placeholder} onChange={(event) => onChange(event.target.value)} /></label>;
}

function CodeArea({ label, value, onChange }) {
  return <label className="fp-field fp-field--wide fp-code-field"><span>{label}</span><textarea value={value || ''} onChange={(event) => onChange(event.target.value)} /></label>;
}

function Info({ label, value }) {
  return <div className="fp-info-box"><span>{label}</span><strong>{value || '-'}</strong></div>;
}

function CodePreview({ title, value }) {
  return <div className="fp-code-preview"><span>{title}</span><pre>{value}</pre></div>;
}

function labelOf(options, value) {
  const item = options.find(([optionValue]) => optionValue === value);
  return item ? item[1] : value || '-';
}

function defaultSourceType(objectType) {
  if (objectType === 'KAFKA_LOGICAL_CONSUMER_GROUP') return 'KAFKA';
  if (objectType === 'ES_LOGICAL_INDEX') return 'ELASTICSEARCH';
  if (objectType === 'APPLICATION_LOGICAL_SERVICE') return 'APPLICATION';
  if (objectType === 'CUSTOM_LOGICAL_OBJECT') return 'MANUAL';
  return 'SPARK';
}

function parseJson(value, fallback) {
  try {
    return JSON.parse(value || '');
  } catch (error) {
    return fallback;
  }
}

function stringifyJson(value) {
  return JSON.stringify(value, null, 2);
}

function normalizeOutputMetricDefinitions(value, aggregation = {}) {
  if (!Array.isArray(value)) {
    return [];
  }
  const aggregationKeys = Object.keys(aggregation || {});
  return value.map((item, index) => {
    if (typeof item === 'string') {
      return {
        metricCode: item,
        metricName: item,
        expression: aggregation[item] || aggregation[aggregationKeys[index]] || '',
        unit: '',
      };
    }
    return {
      metricCode: item.metricCode || item.code || '',
      metricName: item.metricName || item.name || item.metricCode || item.code || '',
      expression: item.expression || aggregation[item.metricCode] || aggregation[item.code] || '',
      unit: item.unit || '',
    };
  });
}

function metricsToAggregation(metrics) {
  const aggregation = {};
  (metrics || []).forEach((metric) => {
    if (metric.metricCode && metric.expression) {
      aggregation[metric.metricCode] = metric.expression;
    }
  });
  return aggregation;
}

function logicalObjectStats(records, total) {
  const enabled = records.filter((item) => item.enabled !== false).length;
  const instances = records.reduce((sum, item) => sum + Number(item.instanceCount || 0), 0);
  const activeInstances = records.reduce((sum, item) => sum + Number(item.activeInstanceCount || 0), 0);
  return [
    { key: 'total', title: '逻辑对象', value: total || records.length, description: '稳定监控对象' },
    { key: 'enabled', title: '启用对象', value: enabled, description: '可用于拓扑与监控', tone: 'success' },
    { key: 'instances', title: '解析实例', value: instances, description: '匹配到的物理对象' },
    { key: 'active', title: '活跃实例', value: activeInstances, description: '最近仍在运行或出现', tone: activeInstances ? 'success' : 'muted' },
  ];
}
