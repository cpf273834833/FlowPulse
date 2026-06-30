import React, { useEffect, useMemo, useState } from 'react';
import { logicalObjectApi } from '../../api/logicalObjectApi';
import { environmentRegionApi } from '../../api/environmentRegionApi';
import { infrastructureApi } from '../../api/infrastructureApi';
import ConfirmDialog from '../../components/ConfirmDialog';
import Pagination from '../../components/Pagination';
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
  aggregationJson: '{\n  "running": "count(status == RUNNING) > 0",\n  "lag": "sum(lag)"\n}',
  outputMetricJson: '[\n  "logical.running",\n  "logical.instance.count"\n]',
  enabled: true,
  description: '',
};

const OBJECT_TYPES = [
  ['SPARK_LOGICAL_JOB', 'Spark 逻辑作业'],
  ['KAFKA_LOGICAL_CONSUMER_GROUP', 'Kafka 逻辑消费组'],
  ['APPLICATION_LOGICAL_SERVICE', '应用逻辑服务'],
  ['CUSTOM_LOGICAL_OBJECT', '自定义逻辑对象'],
];
const SOURCE_TYPES = [['SPARK', 'Spark'], ['KAFKA', 'Kafka'], ['APPLICATION', '应用'], ['MANUAL', '手工']];
const MATCH_TYPES = [['EXACT', '精确'], ['PREFIX', '前缀'], ['REGEX', '正则'], ['EXPRESSION', '表达式']];

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
      JSON.parse(form.aggregationJson || '{}');
      JSON.parse(form.outputMetricJson || '[]');
    } catch (error) {
      setToast({ type: 'error', title: 'JSON 配置不合法', message: error.message });
      return;
    }
    const payload = { ...form, enabled: form.enabled !== false };
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
          <FormGroup title="过滤与聚合" desc="把多个物理实例聚合成逻辑对象指标，供拓扑和告警使用。">
            <CodeArea label="实例过滤 JSON" value={form.instanceFilterJson} onChange={(instanceFilterJson) => setForm({ ...form, instanceFilterJson })} />
            <CodeArea label="聚合策略 JSON" value={form.aggregationJson} onChange={(aggregationJson) => setForm({ ...form, aggregationJson })} />
            <CodeArea label="输出指标 JSON" value={form.outputMetricJson} onChange={(outputMetricJson) => setForm({ ...form, outputMetricJson })} />
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
      <section className="fp-logical-layout">
        <main className="fp-card fp-logical-main">
          <div className="fp-filter-row">
            <label className="fp-inline-search"><span>⌕</span><input value={query.keyword} placeholder="搜索名称、编码、匹配表达式" onChange={(event) => setQuery({ ...query, keyword: event.target.value })} onKeyDown={(event) => event.key === 'Enter' && loadPage({ ...query, pageNo: 1 })} /></label>
            <SelectBare value={query.objectType} options={[['', '全部类型']].concat(OBJECT_TYPES)} onChange={(objectType) => loadPage({ ...query, pageNo: 1, objectType })} />
            <SelectBare value={query.sourceType} options={[['', '全部来源']].concat(SOURCE_TYPES)} onChange={(sourceType) => loadPage({ ...query, pageNo: 1, sourceType })} />
            <button className="fp-button" type="button" onClick={() => loadPage({ ...query, pageNo: 1 })}>筛选</button>
          </div>
          <div className="fp-logical-card-grid">
            {page.records.map((item) => (
              <article className={`fp-logical-card ${selected?.id === item.id ? 'is-active' : ''}`} key={item.id}>
                <button type="button" onClick={() => selectItem(item)}>
                  <div><strong>{item.objectName}</strong><span>{item.objectCode}</span></div>
                  <em>{labelOf(OBJECT_TYPES, item.objectType)}</em>
                  <p>{item.matchPattern || '未配置匹配表达式'}</p>
                  <div className="fp-logical-meta"><span>实例 {item.instanceCount || 0}</span><span>活跃 {item.activeInstanceCount || 0}</span><span>{item.enabled ? '启用' : '停用'}</span></div>
                </button>
                <div className="fp-actions">
                  <button className="fp-link-button" type="button" onClick={() => openEdit(item)}>编辑</button>
                  <button className="fp-link-button fp-link-button--danger" type="button" onClick={() => requestDelete(item)}>删除</button>
                </div>
              </article>
            ))}
            {page.records.length === 0 ? <div className="fp-empty">暂无逻辑对象</div> : null}
          </div>
          <Pagination pageNo={page.pageNo} pageSize={page.pageSize} total={page.total} onChange={(next) => loadPage({ ...query, ...next })} />
        </main>
        <aside className="fp-card fp-logical-side">
          <div className="fp-logical-side__head">
            <h2>{selected?.objectName || '选择逻辑对象'}</h2>
            <p>{selected?.objectCode || '查看实例解析、聚合策略和最近匹配到的物理实例。'}</p>
          </div>
          {selected ? (
            <>
              <div className="fp-actions fp-logical-side-actions">
                <button className="fp-button fp-button--primary" type="button" onClick={resolveSelected}>解析实例</button>
                <button className="fp-button" type="button" onClick={() => openEdit(selected)}>编辑配置</button>
              </div>
              <div className="fp-info-grid">
                <Info label="对象类型" value={labelOf(OBJECT_TYPES, selected.objectType)} />
                <Info label="来源类型" value={selected.sourceType} />
                <Info label="匹配方式" value={selected.matchType} />
                <Info label="匹配字段" value={selected.matchField} />
              </div>
              <CodePreview title="匹配表达式" value={selected.matchPattern || '-'} />
              <CodePreview title="聚合策略" value={selected.aggregationJson || '{}'} />
              <div className="fp-side-section">
                <div className="fp-side-section__title"><h3>实例快照</h3><button className="fp-link-button" type="button" onClick={() => loadInstances()}>刷新</button></div>
                <div className="fp-logical-instance-list">
                  {instances.records.map((instance) => (
                    <div className="fp-logical-instance" key={instance.id}>
                      <strong>{instance.physicalObjectName || instance.physicalObjectCode}</strong>
                      <span>{instance.physicalObjectType} / {instance.status}</span>
                    </div>
                  ))}
                  {instances.records.length === 0 ? <div className="fp-empty">暂无实例快照</div> : null}
                </div>
              </div>
            </>
          ) : <div className="fp-empty">暂无选中对象</div>}
        </aside>
      </section>
      {confirm ? <ConfirmDialog {...confirm} /> : null}
      {toast ? <Toast {...toast} onClose={() => setToast(null)} /> : null}
    </div>
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
  return <select className="fp-native-select" value={value || ''} onChange={(event) => onChange(event.target.value)}>{options.map(([optionValue, labelText]) => <option value={optionValue} key={optionValue}>{labelText}</option>)}</select>;
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
  if (objectType === 'APPLICATION_LOGICAL_SERVICE') return 'APPLICATION';
  if (objectType === 'CUSTOM_LOGICAL_OBJECT') return 'MANUAL';
  return 'SPARK';
}

function logicalObjectStats(records, total) {
  const enabled = records.filter((item) => item.enabled !== false).length;
  const instances = records.reduce((sum, item) => sum + Number(item.instanceCount || 0), 0);
  const activeInstances = records.reduce((sum, item) => sum + Number(item.activeInstanceCount || 0), 0);
  return [
    { key: 'total', title: '逻辑对象', value: total || records.length, description: '稳定监控对象', icon: 'L' },
    { key: 'enabled', title: '启用对象', value: enabled, description: '可用于拓扑与监控', icon: '✓', tone: 'success' },
    { key: 'instances', title: '解析实例', value: instances, description: '匹配到的物理对象', icon: 'R' },
    { key: 'active', title: '活跃实例', value: activeInstances, description: '最近仍在运行或出现', icon: 'A', tone: activeInstances ? 'success' : 'muted' },
  ];
}
