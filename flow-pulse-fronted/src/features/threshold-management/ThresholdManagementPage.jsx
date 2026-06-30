import React, { useEffect, useMemo, useState } from 'react';
import { thresholdApi } from '../../api/thresholdApi';
import { metricApi } from '../../api/metricApi';
import ConfirmDialog from '../../components/ConfirmDialog';
import Pagination from '../../components/Pagination';
import { SecondaryPage } from '../../components/PageChrome';
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
  conditionsJson: '[\n  { "severity": "WARNING", "operator": ">", "value": 80 },\n  { "severity": "ERROR", "operator": ">", "value": 90 }\n]',
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
    try {
      JSON.parse(payload.conditionsJson);
    } catch (error) {
      setToast({ type: 'error', title: '阈值条件不是合法 JSON', message: error.message });
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
            <label className="fp-field fp-field--wide"><span>阈值条件 JSON *</span><textarea value={form.conditionsJson} onChange={(event) => updateForm('conditionsJson', event.target.value)} /></label>
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
            <span className="fp-stat__icon">T</span>
            <div><span>{item.title}</span><strong>{item.value}</strong><em>{item.description}</em></div>
          </div>
        ))}
      </section>

      <section className="fp-threshold-board">
        <div className="fp-card fp-threshold-panel">
          <div className="fp-filter-row fp-filter-row--metric">
            <label className="fp-inline-search">
              <span>⌕</span>
              <input value={query.keyword} placeholder="搜索规则名称、编码、对象" onChange={(event) => setQuery({ ...query, keyword: event.target.value })} onKeyDown={(event) => event.key === 'Enter' && search()} />
            </label>
            <select className="fp-native-select" value={query.scopeType} onChange={(event) => setQuery({ ...query, pageNo: 1, scopeType: event.target.value })}>
              <option value="">全部作用域</option><option value="GLOBAL">全局默认</option><option value="RESOURCE">资源对象</option><option value="TOPOLOGY_ELEMENT">拓扑元素</option>
            </select>
            <select className="fp-native-select" value={query.enabled} onChange={(event) => setQuery({ ...query, pageNo: 1, enabled: event.target.value })}>
              <option value="">全部状态</option><option value="true">启用</option><option value="false">停用</option>
            </select>
            <button className="fp-button" type="button" onClick={search}>筛选</button>
          </div>

          <div className="fp-data-table fp-threshold-table">
            <div className="fp-data-table__row fp-data-table__row--head"><span>规则</span><span>指标</span><span>作用域</span><span>对象</span><span>状态</span><span>操作</span></div>
            {loading ? <div className="fp-empty">加载中...</div> : null}
            {!loading && page.records.length === 0 ? <div className="fp-empty">暂无阈值规则</div> : null}
            {page.records.map((rule) => (
              <div className={`fp-data-table__row ${selected?.id === rule.id ? 'is-selected' : ''}`} key={rule.id} onClick={() => setSelected(rule)}>
                <strong>{rule.ruleName}<em>{rule.ruleCode}</em></strong>
                <span>{rule.metricName || rule.metricCode || '-'}</span>
                <span>{scopeText(rule.scopeType)}</span>
                <span>{rule.objectName || rule.objectCode || rule.topologyElementId || '全局'}</span>
                <span className={`fp-status-text ${rule.enabled ? 'fp-status-text--normal' : ''}`}>{rule.enabled ? '启用' : '停用'}</span>
                <div className="fp-actions">
                  <button className="fp-link-button" type="button" onClick={(event) => { event.stopPropagation(); openDetail(rule); }}>详情</button>
                  <button className="fp-link-button" type="button" onClick={(event) => { event.stopPropagation(); openEdit(rule); }}>编辑</button>
                  <button className="fp-link-button fp-link-button--danger" type="button" onClick={(event) => { event.stopPropagation(); requestDelete(rule); }}>删除</button>
                </div>
              </div>
            ))}
          </div>
          <Pagination pageNo={page.pageNo} pageSize={page.pageSize} total={page.total} onChange={(pageNo, pageSize) => setQuery({ ...query, pageNo, pageSize })} />
        </div>

        <aside className="fp-card fp-threshold-side">
          <div className="fp-threshold-side__head">
            <h2>{selected?.ruleName || '选择一条阈值规则'}</h2>
            <p>{selected?.ruleCode || '查看规则作用域、阈值条件和判定策略。'}</p>
          </div>
          {selected ? (
            <>
              <div className="fp-threshold-kv">
                <div><span>指标</span><strong>{selected.metricName || selected.metricCode || '-'}</strong></div>
                <div><span>作用域</span><strong>{scopeText(selected.scopeType)}</strong></div>
                <div><span>对象</span><strong>{selected.objectName || selected.objectCode || '全局'}</strong></div>
                <div><span>判定窗口</span><strong>{selected.evaluationWindowSec}s</strong></div>
                <div><span>连续次数</span><strong>{selected.consecutiveCount}</strong></div>
                <div><span>恢复策略</span><strong>{selected.recoveryPolicy === 'MANUAL' ? '人工关闭' : '自动恢复'}</strong></div>
              </div>
              <pre className="fp-condition-preview">{formatJson(selected.conditionsJson)}</pre>
              <div className="fp-actions fp-side-section">
                <button className="fp-button" type="button" onClick={() => openDetail(selected)}>详情</button>
                <button className="fp-button fp-button--primary" type="button" onClick={() => openEdit(selected)}>编辑</button>
              </div>
            </>
          ) : <div className="fp-empty">暂无选中规则</div>}
        </aside>
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
          <pre className="fp-condition-preview">{formatJson(rule.conditionsJson)}</pre>
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
          <pre className="fp-condition-preview">{formatJson(rule.conditionsJson)}</pre>
        </div>
        <div className="fp-modal__footer"><button className="fp-button" type="button" onClick={onBack}>返回</button><button className="fp-button fp-button--primary" type="button" onClick={onEdit}>编辑</button></div>
      </div>
    </div>
  );
}

function Info({ label, value }) {
  return <div className="fp-info-box"><span>{label}</span><strong>{value || '-'}</strong></div>;
}

function toForm(rule) {
  return { ...DEFAULT_FORM, ...rule, enabled: rule.enabled !== false };
}

function normalizePayload(form) {
  return {
    ...form,
    evaluationWindowSec: Number(form.evaluationWindowSec) || 60,
    consecutiveCount: Number(form.consecutiveCount) || 1,
    objectType: form.scopeType === 'GLOBAL' ? '' : form.objectType,
    objectId: form.scopeType === 'RESOURCE' ? form.objectId : '',
    topologyId: form.scopeType === 'TOPOLOGY_ELEMENT' ? form.topologyId : '',
    topologyElementId: form.scopeType === 'TOPOLOGY_ELEMENT' ? form.topologyElementId : '',
    topologyElementType: form.scopeType === 'TOPOLOGY_ELEMENT' ? form.topologyElementType : '',
  };
}

function scopeText(scopeType) {
  const map = { GLOBAL: '全局默认', RESOURCE: '资源对象', TOPOLOGY_ELEMENT: '拓扑元素' };
  return map[scopeType] || scopeType || '-';
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
