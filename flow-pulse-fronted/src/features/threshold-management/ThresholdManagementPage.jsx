import React, { useEffect, useMemo, useState } from 'react';
import { thresholdApi } from '../../api/thresholdApi';
import { metricApi } from '../../api/metricApi';
import ConfirmDialog from '../../components/ConfirmDialog';
import Pagination from '../../components/Pagination';
import SelectControl from '../../components/SelectControl';
import { SecondaryPage, StatIcon } from '../../components/PageChrome';
import Toast from '../../components/Toast';
import { t } from '../../i18n';
import './ThresholdManagementPage.css';

const DEFAULT_QUERY = {
  pageNo: 1,
  pageSize: 10,
  keyword: '',
  scopeType: '',
  enabled: '',
};
const SCOPE_FILTER_OPTIONS = [['', '全部作用域'], ['GLOBAL', '全局默认'], ['RESOURCE', '资源对象'], ['TOPOLOGY_ELEMENT', '拓扑元素']];
const ENABLED_FILTER_OPTIONS = [['', '全部状态'], ['true', '启用'], ['false', '停用']];

const CONDITION_SEVERITIES = [
  ['REMIND', '提醒'],
  ['WARNING', '警告'],
  ['ERROR', '错误'],
  ['CRITICAL', '紧急'],
];

const CONDITION_OPERATORS = [
  ['>', '>'],
  ['>=', '>='],
  ['<', '<'],
  ['<=', '<='],
  ['==', '=='],
  ['!=', '!='],
];

const DEFAULT_CONDITIONS = [
  { enabled: true, severity: 'WARNING', operator: '>', value: 80 },
  { enabled: true, severity: 'ERROR', operator: '>', value: 90 },
];

const DEFAULT_FORM = {
  ruleCode: '',
  ruleName: '',
  metricDefinitionId: '',
  scopeType: 'GLOBAL',
  objectType: '',
  objectId: '',
  objectCode: '',
  objectName: '',
  topologyId: '',
  topologyElementId: '',
  topologyElementType: '',
  conditionsJson: JSON.stringify(DEFAULT_CONDITIONS),
  conditions: DEFAULT_CONDITIONS,
  evaluationWindowSec: 60,
  consecutiveCount: 1,
  recoveryPolicy: 'AUTO',
  enabled: true,
  description: '',
};

export default function ThresholdManagementPage() {
  const [query, setQuery] = useState(DEFAULT_QUERY);
  const [page, setPage] = useState({ records: [], total: 0, pageNo: 1, pageSize: 10 });
  const [stats, setStats] = useState([]);
  const [metrics, setMetrics] = useState([]);
  const [selected, setSelected] = useState(null);
  const [mode, setMode] = useState('list');
  const [editingId, setEditingId] = useState('');
  const [form, setForm] = useState(DEFAULT_FORM);
  const [confirm, setConfirm] = useState(null);
  const [toast, setToast] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadMetrics();
    applyTopologyPrefill();
  }, []);

  useEffect(() => {
    if (mode === 'list') {
      loadPage(query);
    }
  }, [query.pageNo, query.pageSize, mode]);

  const metricMap = useMemo(() => {
    const map = {};
    metrics.forEach((metric) => {
      map[metric.id] = metric;
    });
    return map;
  }, [metrics]);

  async function loadMetrics() {
    const response = await metricApi.page({ pageNo: 1, pageSize: 200, enabled: 'true' });
    setMetrics(response.metrics?.records || []);
  }

  async function loadPage(nextQuery = query) {
    setLoading(true);
    try {
      const response = await thresholdApi.page(nextQuery);
      const rules = response.rules || { records: [], total: 0, pageNo: nextQuery.pageNo, pageSize: nextQuery.pageSize };
      setPage(rules);
      setStats(response.stats || []);
      setSelected((current) => current || rules.records[0] || null);
    } finally {
      setLoading(false);
    }
  }

  function search() {
    setQuery((value) => ({ ...value, pageNo: 1 }));
    loadPage({ ...query, pageNo: 1 });
  }

  function openCreate() {
    setEditingId('');
    setForm({ ...DEFAULT_FORM });
    setMode('edit');
  }

  function applyTopologyPrefill() {
    const raw = window.sessionStorage.getItem('flowpulse.threshold.prefill');
    if (!raw) return;
    window.sessionStorage.removeItem('flowpulse.threshold.prefill');
    try {
      const preset = JSON.parse(raw);
      const elementName = preset.objectName || preset.objectCode || '拓扑元素';
      setEditingId('');
      setForm({
        ...DEFAULT_FORM,
        scopeType: 'TOPOLOGY_ELEMENT',
        objectType: preset.objectType || '',
        objectId: preset.objectId || '',
        objectCode: preset.objectCode || '',
        objectName: preset.objectName || '',
        topologyId: preset.topologyId || '',
        topologyElementId: preset.topologyElementId || '',
        topologyElementType: preset.topologyElementType || '',
        ruleCode: `topology-${preset.topologyElementType || 'element'}-${Date.now()}`,
        ruleName: `${elementName} 阈值规则`,
      });
      setMode('edit');
      setToast({ type: 'info', title: '已带入拓扑元素', message: `${preset.topologyName || '当前拓扑'} / ${elementName}` });
    } catch (error) {
      setToast({ type: 'error', title: '拓扑阈值上下文无效', message: error.message });
    }
  }

  async function openEdit(rule) {
    const detail = await thresholdApi.detail(rule.id);
    setEditingId(rule.id);
    setForm(toForm(detail));
    setSelected(detail);
    setMode('edit');
  }

  async function openDetail(rule) {
    const detail = await thresholdApi.detail(rule.id);
    setSelected(detail);
    setMode('detail');
  }

  async function save() {
    const payload = normalizePayload(form);
    if (!payload.ruleCode || !payload.ruleName || !payload.metricDefinitionId) {
      setToast({ type: 'warning', title: '请补全必填信息', message: '规则编码、规则名称和指标定义不能为空。' });
      return;
    }
    const activeConditions = normalizeConditions(form.conditions).filter((condition) => condition.enabled !== false);
    if (activeConditions.length === 0 || activeConditions.some((condition) => condition.value === '' || condition.value === null || Number.isNaN(Number(condition.value)))) {
      setToast({ type: 'warning', title: '请完善阈值条件', message: '至少启用一条阈值条件，并填写有效的阈值数值。' });
      return;
    }
    const response = editingId ? await thresholdApi.update(editingId, payload) : await thresholdApi.create(payload);
    setToast({ type: 'success', title: editingId ? '阈值规则已更新' : '阈值规则已创建', message: response.ruleName });
    setSelected(response);
    setMode('list');
    loadPage(query);
  }

  function requestDelete(rule) {
    setConfirm({
      title: '确认删除阈值规则',
      content: `删除后不会再参与告警判定：${rule.ruleName}`,
      onCancel: () => setConfirm(null),
      onConfirm: async () => {
        await thresholdApi.delete(rule.id);
        setConfirm(null);
        setToast({ type: 'success', title: '阈值规则已删除', message: rule.ruleName });
        setSelected(null);
        loadPage(query);
      },
    });
  }

  if (mode === 'edit') {
    return (
      <div className="fp-page fp-threshold-page">
        <button className="fp-link-button fp-back-link" type="button" onClick={() => setMode('list')}>返回阈值管理</button>
        <div className="fp-form-header">
          <div>
            <span className="fp-kicker">{editingId ? '编辑阈值规则' : '新增阈值规则'}</span>
            <h1>{form.ruleName || form.ruleCode || '未命名规则'}</h1>
            <p>配置指标值到告警级别的判定关系。资源和拓扑入口后续可复用同一套阈值表单。</p>
          </div>
          <div className="fp-actions">
            <button className="fp-button" type="button" onClick={() => setMode('list')}>取消</button>
            <button className="fp-button fp-button--primary" type="button" onClick={save}>保存</button>
          </div>
        </div>
        <section className="fp-card">
          <div className="fp-threshold-form">
            <label className="fp-field"><span>规则编码 *</span><input value={form.ruleCode} onChange={(event) => updateForm('ruleCode', event.target.value)} /></label>
            <label className="fp-field"><span>规则名称 *</span><input value={form.ruleName} onChange={(event) => updateForm('ruleName', event.target.value)} /></label>
            <label className="fp-field"><span>指标定义 *</span><select value={form.metricDefinitionId} onChange={(event) => updateForm('metricDefinitionId', event.target.value)}><option value="">请选择指标</option>{metrics.map((metric) => <option key={metric.id} value={metric.id}>{metric.metricName}</option>)}</select></label>
            <label className="fp-field"><span>作用域</span><select value={form.scopeType} onChange={(event) => updateForm('scopeType', event.target.value)}><option value="GLOBAL">全局默认</option><option value="RESOURCE">资源对象</option><option value="TOPOLOGY_ELEMENT">拓扑元素</option></select></label>
            <label className="fp-field"><span>对象类型</span><input disabled={form.scopeType === 'GLOBAL'} value={form.objectType} onChange={(event) => updateForm('objectType', event.target.value)} /></label>
            <label className="fp-field"><span>对象ID</span><input disabled={form.scopeType !== 'RESOURCE'} value={form.objectId} onChange={(event) => updateForm('objectId', event.target.value)} /></label>
            <label className="fp-field"><span>对象编码</span><input disabled={form.scopeType === 'GLOBAL'} value={form.objectCode} onChange={(event) => updateForm('objectCode', event.target.value)} /></label>
            <label className="fp-field"><span>对象名称</span><input disabled={form.scopeType === 'GLOBAL'} value={form.objectName} onChange={(event) => updateForm('objectName', event.target.value)} /></label>
            <label className="fp-field"><span>拓扑ID</span><input disabled={form.scopeType !== 'TOPOLOGY_ELEMENT'} value={form.topologyId} onChange={(event) => updateForm('topologyId', event.target.value)} /></label>
            <label className="fp-field"><span>拓扑元素ID</span><input disabled={form.scopeType !== 'TOPOLOGY_ELEMENT'} value={form.topologyElementId} onChange={(event) => updateForm('topologyElementId', event.target.value)} /></label>
            <label className="fp-field"><span>拓扑元素类型</span><select disabled={form.scopeType !== 'TOPOLOGY_ELEMENT'} value={form.topologyElementType} onChange={(event) => updateForm('topologyElementType', event.target.value)}><option value="">请选择</option><option value="NODE">节点</option><option value="EDGE">连线</option></select></label>
            <label className="fp-field"><span>恢复策略</span><select value={form.recoveryPolicy} onChange={(event) => updateForm('recoveryPolicy', event.target.value)}><option value="AUTO">自动恢复</option><option value="MANUAL">人工关闭</option></select></label>
            <label className="fp-field"><span>判定窗口（秒）</span><input type="number" min="10" value={form.evaluationWindowSec} onChange={(event) => updateForm('evaluationWindowSec', event.target.value)} /></label>
            <label className="fp-field"><span>连续命中次数</span><input type="number" min="1" value={form.consecutiveCount} onChange={(event) => updateForm('consecutiveCount', event.target.value)} /></label>
            <label className="fp-field"><span>启用状态</span><select value={String(form.enabled)} onChange={(event) => updateForm('enabled', event.target.value === 'true')}><option value="true">启用</option><option value="false">停用</option></select></label>
            <ThresholdConditionEditor
              value={form.conditions}
              onChange={(conditions) => updateForm('conditions', conditions)}
            />
            <label className="fp-field fp-field--wide"><span>描述</span><textarea value={form.description} onChange={(event) => updateForm('description', event.target.value)} /></label>
          </div>
        </section>
        {toast ? <Toast {...toast} onClose={() => setToast(null)} /> : null}
      </div>
    );
  }

  if (mode === 'detail' && selected) {
    return (
      <ThresholdDetailPage
        rule={selected}
        metric={metricMap[selected.metricDefinitionId]}
        onBack={() => setMode('list')}
        onEdit={() => openEdit(selected)}
      />
    );
  }

  return (
    <div className="fp-page fp-threshold-page">
      <header className="fp-page__header">
        <div>
          <h1>阈值管理</h1>
          <p>统一维护指标到告警级别的判定规则，为告警中心和拓扑状态联动提供依据。</p>
        </div>
        <button className="fp-button fp-button--primary" type="button" onClick={openCreate}>新增阈值规则</button>
      </header>

      <section className="fp-stat-grid fp-stat-grid--four">
        {(stats.length ? stats : defaultStats()).map((item) => (
          <div className="fp-stat" key={item.title}>
            <StatIcon stat={item} />
            <div><span>{item.title}</span><strong>{item.value}</strong><em>{item.description}</em></div>
          </div>
        ))}
      </section>

      <section className="fp-threshold-board fp-threshold-board--single">
        <div className="fp-card fp-threshold-panel">
          <div className="fp-filter-row fp-filter-row--metric fp-filter-row--threshold">
            <label className="fp-inline-search">
              <span>⌕</span>
              <input value={query.keyword} placeholder="搜索规则名称、编码、对象" onChange={(event) => setQuery({ ...query, keyword: event.target.value })} onKeyDown={(event) => event.key === 'Enter' && search()} />
            </label>
            <SelectControl value={query.scopeType} options={SCOPE_FILTER_OPTIONS} onChange={(scopeType) => setQuery({ ...query, pageNo: 1, scopeType })} />
            <SelectControl value={query.enabled} options={ENABLED_FILTER_OPTIONS} onChange={(enabled) => setQuery({ ...query, pageNo: 1, enabled })} />
            <button className="fp-button" type="button" onClick={search}>筛选</button>
          </div>

          <div className="fp-compact-list">
            {loading ? <div className="fp-empty">加载中...</div> : null}
            {!loading && page.records.length === 0 ? <div className="fp-empty">暂无阈值规则</div> : null}
            {page.records.map((rule) => (
              <article className={`fp-compact-row fp-compact-row--threshold ${selected?.id === rule.id ? 'is-selected' : ''}`} key={rule.id} role="button" tabIndex={0} onClick={() => openDetail(rule)} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') openDetail(rule); }}>
                <div className="fp-compact-row__identity"><strong>{rule.ruleName}</strong><em>{rule.ruleCode}</em></div>
                <div className="fp-compact-row__datum"><span>指标</span><strong>{rule.metricName || rule.metricCode || '-'}</strong></div>
                <div className="fp-compact-row__datum"><span>作用范围</span><strong>{scopeText(rule.scopeType)}</strong></div>
                <div className="fp-compact-row__datum"><span>对象</span><strong>{rule.objectName || rule.objectCode || rule.topologyElementId || '全局'}</strong></div>
                <span className={`fp-status-text ${rule.enabled ? 'fp-status-text--normal' : ''}`}>{rule.enabled ? '启用' : '停用'}</span>
                <div className="fp-compact-row__actions">
                  <button className="fp-link-button" type="button" onClick={(event) => { event.stopPropagation(); openDetail(rule); }}>详情</button>
                  <button className="fp-link-button" type="button" onClick={(event) => { event.stopPropagation(); openEdit(rule); }}>编辑</button>
                  <button className="fp-link-button fp-link-button--danger" type="button" onClick={(event) => { event.stopPropagation(); requestDelete(rule); }}>删除</button>
                </div>
              </article>
            ))}
          </div>
          <Pagination pageNo={page.pageNo} pageSize={page.pageSize} total={page.total} onChange={(pageNo, pageSize) => setQuery({ ...query, pageNo, pageSize })} />
        </div>
      </section>

      {confirm ? <ConfirmDialog {...confirm} /> : null}
      {toast ? <Toast {...toast} onClose={() => setToast(null)} /> : null}
    </div>
  );

  function updateForm(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }
}

function ThresholdDetailPage({ rule, metric, onBack, onEdit }) {
  return (
    <SecondaryPage
      backText="返回阈值管理"
      onBack={onBack}
      eyebrow="阈值详情"
      title={rule.ruleName}
      description={rule.ruleCode}
      actions={<><button className="fp-button" type="button" onClick={onBack}>返回</button><button className="fp-button fp-button--primary" type="button" onClick={onEdit}>编辑</button></>}
    >
      <div className="fp-secondary-surface">
        <section className="fp-side-callout fp-side-callout--ok">
          <span>规则摘要</span>
          <strong>当 {metric?.metricName || rule.metricName || '指标'} 在 {rule.evaluationWindowSec}s 内连续命中 {rule.consecutiveCount} 次时触发告警，{rule.recoveryPolicy === 'MANUAL' ? '由人工关闭' : '恢复后自动关闭'}。</strong>
        </section>
        <div className="fp-info-grid">
          <Info label="规则编码" value={rule.ruleCode} />
          <Info label="指标定义" value={metric?.metricName || rule.metricName || '-'} />
          <Info label="作用域" value={scopeText(rule.scopeType)} />
          <Info label="对象" value={rule.objectName || rule.objectCode || '全局'} />
          <Info label="判定窗口" value={`${rule.evaluationWindowSec}s`} />
          <Info label="连续命中" value={rule.consecutiveCount} />
          <Info label="恢复策略" value={rule.recoveryPolicy === 'MANUAL' ? '人工关闭' : '自动恢复'} />
          <Info label="启用状态" value={rule.enabled ? '启用' : '停用'} />
        </div>
        <section className="fp-card fp-threshold-detail-card">
          <div className="fp-card__title">
            <div>
              <h2>阈值条件</h2>
              <p>按严重等级定义指标值到告警状态的映射关系。</p>
            </div>
          </div>
          <ConditionsPreview conditions={parseConditions(rule.conditionsJson)} />
        </section>
      </div>
    </SecondaryPage>
  );
}

function RuleDetail({ rule, metric, onBack, onEdit }) {
  return (
    <div className="fp-modal-mask">
      <div className="fp-modal">
        <div className="fp-modal__header"><h3>{rule.ruleName}</h3><button className="fp-icon-button" type="button" onClick={onBack}>×</button></div>
        <div className="fp-modal__body">
          <div className="fp-info-grid">
            <Info label="规则编码" value={rule.ruleCode} />
            <Info label="指标定义" value={metric?.metricName || rule.metricName || '-'} />
            <Info label="作用域" value={scopeText(rule.scopeType)} />
            <Info label="对象" value={rule.objectName || rule.objectCode || '全局'} />
            <Info label="判定窗口" value={`${rule.evaluationWindowSec}s`} />
            <Info label="连续命中" value={rule.consecutiveCount} />
          </div>
          <ConditionsPreview conditions={parseConditions(rule.conditionsJson)} />
        </div>
        <div className="fp-modal__footer"><button className="fp-button" type="button" onClick={onBack}>返回</button><button className="fp-button fp-button--primary" type="button" onClick={onEdit}>编辑</button></div>
      </div>
    </div>
  );
}

function Info({ label, value }) {
  return <div className="fp-info-box"><span>{label}</span><strong>{value || '-'}</strong></div>;
}

function ThresholdConditionEditor({ value, onChange }) {
  const conditions = normalizeConditions(value);
  function update(index, field, nextValue) {
    onChange(conditions.map((condition, currentIndex) => (currentIndex === index ? { ...condition, [field]: nextValue } : condition)));
  }
  function addCondition() {
    onChange(conditions.concat({ enabled: true, severity: 'WARNING', operator: '>=', value: '' }));
  }
  function removeCondition(index) {
    onChange(conditions.filter((_, currentIndex) => currentIndex !== index));
  }
  return (
    <section className="fp-threshold-condition-editor fp-field--wide">
      <div className="fp-threshold-condition-editor__head">
        <div>
          <span>阈值条件 *</span>
          <p>按告警级别配置判定条件，保存时自动生成后端需要的规则结构。</p>
        </div>
        <button className="fp-button" type="button" onClick={addCondition}>新增条件</button>
      </div>
      <div className="fp-threshold-condition-list">
        {conditions.map((condition, index) => (
          <div className="fp-threshold-condition-row" key={`${condition.severity}-${index}`}>
            <label className="fp-switch-line">
              <input type="checkbox" checked={condition.enabled !== false} onChange={(event) => update(index, 'enabled', event.target.checked)} />
              <span>{condition.enabled !== false ? '参与判定' : '不参与'}</span>
            </label>
            <select value={condition.severity || 'WARNING'} onChange={(event) => update(index, 'severity', event.target.value)}>
              {CONDITION_SEVERITIES.map(([code, label]) => <option key={code} value={code}>{label}</option>)}
            </select>
            <select value={condition.operator || '>='} onChange={(event) => update(index, 'operator', event.target.value)}>
              {CONDITION_OPERATORS.map(([code, label]) => <option key={code} value={code}>{label}</option>)}
            </select>
            <input type="number" value={condition.value ?? ''} placeholder="阈值" onChange={(event) => update(index, 'value', event.target.value)} />
            <button className="fp-link-button fp-link-button--danger" type="button" onClick={() => removeCondition(index)}>删除</button>
          </div>
        ))}
      </div>
    </section>
  );
}

function ConditionsPreview({ conditions }) {
  return (
    <div className="fp-threshold-condition-preview">
      {normalizeConditions(conditions).map((condition, index) => (
        <div className="fp-threshold-condition-pill" key={`${condition.severity}-${index}`}>
          <span>{labelOf(CONDITION_SEVERITIES, condition.severity)}</span>
          <strong>{condition.operator} {condition.value}</strong>
        </div>
      ))}
    </div>
  );
}

function toForm(rule) {
  return { ...DEFAULT_FORM, ...rule, enabled: rule.enabled !== false, conditions: parseConditions(rule.conditionsJson) };
}

function normalizePayload(form) {
  const conditions = normalizeConditions(form.conditions)
    .filter((condition) => condition.enabled !== false)
    .map((condition) => ({
      enabled: true,
      severity: condition.severity || 'WARNING',
      operator: condition.operator || '>=',
      value: Number(condition.value),
    }));
  return {
    ...form,
    conditionsJson: JSON.stringify(conditions),
    evaluationWindowSec: Number(form.evaluationWindowSec) || 60,
    consecutiveCount: Number(form.consecutiveCount) || 1,
    objectType: form.scopeType === 'GLOBAL' ? '' : form.objectType,
    objectId: form.scopeType === 'RESOURCE' ? form.objectId : '',
    topologyId: form.scopeType === 'TOPOLOGY_ELEMENT' ? form.topologyId : '',
    topologyElementId: form.scopeType === 'TOPOLOGY_ELEMENT' ? form.topologyElementId : '',
    topologyElementType: form.scopeType === 'TOPOLOGY_ELEMENT' ? form.topologyElementType : '',
  };
}

function normalizeConditions(value) {
  if (Array.isArray(value) && value.length > 0) {
    return value.map((condition) => ({ enabled: condition.enabled !== false, severity: condition.severity || 'WARNING', operator: condition.operator || '>=', value: condition.value ?? '' }));
  }
  return DEFAULT_CONDITIONS.map((condition) => ({ ...condition }));
}

function parseConditions(value) {
  try {
    const parsed = JSON.parse(value || '[]');
    return normalizeConditions(parsed);
  } catch (error) {
    return normalizeConditions(DEFAULT_CONDITIONS);
  }
}

function scopeText(scopeType) {
  const map = { GLOBAL: '全局默认', RESOURCE: '资源对象', TOPOLOGY_ELEMENT: '拓扑元素' };
  return map[scopeType] || scopeType || '-';
}

function labelOf(options, value) {
  const option = options.find(([code]) => code === value);
  return option ? option[1] : value || '-';
}

function formatJson(value) {
  try {
    return JSON.stringify(JSON.parse(value || '[]'), null, 2);
  } catch (error) {
    return value || '-';
  }
}

function defaultStats() {
  return [
    { title: '阈值规则', value: '0', description: '已维护的判定规则' },
    { title: '启用规则', value: '0', description: '正在参与告警判定' },
    { title: '资源规则', value: '0', description: '绑定到具体资源对象' },
    { title: '拓扑规则', value: '0', description: '绑定到拓扑节点或连线' },
  ];
}
