import React from 'react';
import { MetricConfigEditor } from '../metric-config/MetricConfigEditor';

export function ElementEditor({
  selected,
  nodes,
  context,
  activeTab,
  metrics,
  implementations,
  executorNodes,
  metricConfigs,
  thresholdRules,
  metricDraft,
  thresholdDraft,
  onTabChange,
  onMetricDraft,
  onStartMetricConfig,
  onToggleMetric,
  onThresholdDraft,
  onSaveMetric,
  onSaveThreshold,
  onChange,
}) {
  const currentTab = activeTab === 'thresholds' ? 'metrics' : activeTab;
  return (
    <div className="fp-topology-editor">
      <div className="fp-inspector-tabs">
        <button className={currentTab === 'properties' ? 'is-active' : ''} type="button" onClick={() => onTabChange('properties')}>属性</button>
        <button className={currentTab === 'metrics' ? 'is-active' : ''} type="button" onClick={() => onTabChange('metrics')}>指标</button>
        <button className={currentTab === 'alerts' ? 'is-active' : ''} type="button" onClick={() => onTabChange('alerts')}>告警</button>
      </div>

      {currentTab === 'properties' ? <TopologyElementProperties selected={selected} nodes={nodes} onChange={onChange} /> : null}
      {currentTab === 'metrics' ? (
        <TopologyMetricPanel
          context={context}
          metrics={metrics}
          implementations={implementations}
          executorNodes={executorNodes}
          metricConfigs={metricConfigs}
          thresholdRules={thresholdRules}
          metricDraft={metricDraft}
          thresholdDraft={thresholdDraft}
          onMetricDraft={onMetricDraft}
          onStartMetricConfig={onStartMetricConfig}
          onToggleMetric={onToggleMetric}
          onThresholdDraft={onThresholdDraft}
          onSaveMetric={onSaveMetric}
          onSaveThreshold={onSaveThreshold}
        />
      ) : null}
      {currentTab === 'alerts' ? <TopologyAlertPanel context={context} /> : null}
    </div>
  );
}

function TopologyMetricPanel({
  context,
  metrics,
  implementations,
  executorNodes,
  metricConfigs,
  thresholdRules,
  metricDraft,
  thresholdDraft,
  onMetricDraft,
  onStartMetricConfig,
  onToggleMetric,
  onThresholdDraft,
  onSaveMetric,
  onSaveThreshold,
}) {
  const configs = metricConfigs.configs.records || [];
  const configByMetricId = {};
  configs.forEach((item) => { configByMetricId[item.metricDefinitionId] = item; });
  const thresholdByMetric = {};
  (thresholdRules || []).forEach((rule) => { thresholdByMetric[rule.metricDefinitionId] = rule; });
  const availableMetrics = (metrics || []).filter((metric) => !configByMetricId[metric.id]);
  const allMetrics = metrics || [];
  const draft = metricDraft;

  return (
    <div className="fp-topology-config-panel fp-topology-metric-workspace">
      <div className="fp-topology-config-head">
        <div>
          <strong>指标清单</strong>
          <span>{context?.topologyElementType === 'EDGE' ? '展示当前连线可配置的全部指标，可直接启停并继续配置参数。' : '展示当前节点可配置的全部指标，可直接启停并继续配置参数。'}</span>
        </div>
      </div>

      <div className="fp-topology-metric-summary">
        <div><strong>{allMetrics.length}</strong><span>可配置</span></div>
        <div><strong>{configs.filter((item) => item.enabled !== false).length}</strong><span>已开启</span></div>
        <div><strong>{availableMetrics.length}</strong><span>可新增</span></div>
      </div>

      <div className="fp-topology-metric-card-list">
        {allMetrics.map((metric) => {
          const config = configByMetricId[metric.id];
          const enabled = Boolean(config && config.enabled !== false);
          const thresholdRule = thresholdByMetric[metric.id];
          const editingThisMetric = draft && draft.metricDefinitionId === metric.id;
          return (
            <article className={`fp-topology-metric-card ${enabled ? 'is-enabled' : 'is-disabled'}`} key={metric.id}>
              <button className="fp-topology-metric-card__main" type="button" disabled={!config} onClick={() => config && onMetricDraft(config)}>
                <div>
                  <strong>{metric.metricName || config?.metricName || metric.metricCode}</strong>
                  <span>{metric.metricCode || config?.metricCode || metric.id}</span>
                </div>
                <em className={config?.parameterJson ? 'is-ready' : ''}>{config ? (config.parameterJson ? '参数已配置' : '待配参数') : '未开启'}</em>
                <small>{config ? `${config.implementationName || '默认实现'} / ${labelExecutionMode(config.executionMode)} / ${config.intervalSec || 60}s` : '开启后可配置采集实现、参数和周期'}</small>
                {config ? (
                  <div className="fp-topology-metric-runtime">
                    <span>
                      <b>当前值</b>
                      <strong>{formatMetricValue(config.currentValue, metric.valueUnit)}</strong>
                    </span>
                    <span>
                      <b>最近采集</b>
                      <strong>{formatTime(config.currentValueAt || config.lastCollectAt)}</strong>
                    </span>
                    <span className={`is-${String(config.lastCollectStatus || 'UNKNOWN').toLowerCase()}`}>
                      <b>采集状态</b>
                      <strong>{collectStatusText(config.lastCollectStatus)}</strong>
                    </span>
                  </div>
                ) : null}
              </button>
              <label className={`fp-switch-field ${enabled ? 'is-on' : ''}`} onClick={(event) => event.stopPropagation()}>
                <input
                  type="checkbox"
                  checked={enabled}
                  onChange={(event) => {
                    if (!config && event.target.checked) {
                      onStartMetricConfig([metric]);
                      return;
                    }
                    onToggleMetric(metric, config, event.target.checked);
                  }}
                />
                <span>{enabled ? '已开启' : '已关闭'}</span>
              </label>
              {config ? <button className="fp-link-button" type="button" onClick={() => onMetricDraft(config)}>配置</button> : null}
              {config ? (
                <button className="fp-link-button" type="button" onClick={() => onThresholdDraft(defaultTopologyThresholdRule(context, metric, thresholdRule))}>
                  {thresholdRule ? '修改阈值' : '配置阈值'}
                </button>
              ) : null}
              {config ? (
                <div className={`fp-topology-threshold-summary ${thresholdRule ? 'is-configured' : ''}`}>
                  <span>阈值</span>
                  <strong>{summarizeTopologyThreshold(thresholdRule)}</strong>
                </div>
              ) : null}
              {editingThisMetric ? (
                <div className="fp-topology-metric-editor-slot">
                  <MetricConfigEditor
                    context={context}
                    metrics={draft.id ? allMetrics : availableMetrics}
                    implementations={implementations}
                    executorNodes={executorNodes}
                    draft={draft}
                    onDraft={onMetricDraft}
                    onCancel={() => onMetricDraft(null)}
                    onSave={onSaveMetric}
                  />
                </div>
              ) : null}
              {thresholdDraft && thresholdDraft.metricDefinitionId === metric.id ? (
                <div className="fp-topology-metric-editor-slot">
                  <TopologyThresholdForm draft={thresholdDraft} onDraft={onThresholdDraft} onCancel={() => onThresholdDraft(null)} onSave={onSaveThreshold} />
                </div>
              ) : null}
            </article>
          );
        })}
        {allMetrics.length === 0 && !draft ? <div className="fp-empty">当前元素没有适用指标，请先在指标中心配置适用范围。</div> : null}
      </div>
    </div>
  );
}

function TopologyThresholdForm({ draft, onDraft, onCancel, onSave }) {
  function updateCondition(severity, patch) {
    onDraft({ ...draft, conditions: draft.conditions.map((item) => (item.severity === severity ? { ...item, ...patch } : item)) });
  }

  return (
    <div className="fp-topology-inline-form">
      <label className="is-wide">
        <span>规则名称</span>
        <input value={draft.ruleName || ''} onChange={(event) => onDraft({ ...draft, ruleName: event.target.value })} />
      </label>
      <div className="fp-threshold-mini-table">
        {draft.conditions.map((condition) => (
          <div className={`fp-threshold-mini-row ${condition.enabled ? 'is-enabled' : ''}`} key={condition.severity}>
            <label>
              <input type="checkbox" checked={condition.enabled} onChange={(event) => updateCondition(condition.severity, { enabled: event.target.checked })} />
              {severityText(condition.severity)}
            </label>
            <select value={condition.operator} disabled={!condition.enabled} onChange={(event) => updateCondition(condition.severity, { operator: event.target.value })}>
              <option value=">">&gt;</option>
              <option value=">=">&gt;=</option>
              <option value="<">&lt;</option>
              <option value="<=">&lt;=</option>
              <option value="==">=</option>
              <option value="!=">!=</option>
            </select>
            <input type="number" value={condition.value} disabled={!condition.enabled} onChange={(event) => updateCondition(condition.severity, { value: event.target.value })} />
          </div>
        ))}
      </div>
      <label>
        <span>判定窗口</span>
        <input type="number" min="10" value={draft.evaluationWindowSec || 60} onChange={(event) => onDraft({ ...draft, evaluationWindowSec: Number(event.target.value) })} />
      </label>
      <label>
        <span>连续命中</span>
        <input type="number" min="1" value={draft.consecutiveCount || 1} onChange={(event) => onDraft({ ...draft, consecutiveCount: Number(event.target.value) })} />
      </label>
      <div className="fp-actions">
        <button className="fp-button" type="button" onClick={onCancel}>取消</button>
        <button className="fp-button fp-button--primary" type="button" onClick={() => onSave(draft)}>保存阈值</button>
      </div>
    </div>
  );
}

function TopologyAlertPanel({ context }) {
  return (
    <div className="fp-topology-config-panel">
      <div className="fp-topology-config-head">
        <div>
          <strong>告警状态</strong>
          <span>当前元素：{context?.objectName || '-'}</span>
        </div>
      </div>
      <div className="fp-topology-alert-empty">
        <strong>暂无活动告警</strong>
        <span>这里将展示当前节点或连线的活动告警、最近恢复记录和故障解释。</span>
      </div>
    </div>
  );
}

function TopologyElementProperties({ selected, nodes, onChange }) {
  const data = selected.data;
  if (selected.type === 'node') {
    return (
      <div className="fp-topology-property-grid">
        <label><span>节点名称</span><input value={data.nodeName || ''} onChange={(event) => onChange('nodeName', event.target.value)} /></label>
        <InfoBox label="节点类型" value={nodeTypeText(data.nodeType)} code={data.nodeType} />
        <InfoBox label="对象类型" value={objectTypeText(data.objectType)} code={data.objectType} />
        <label><span>对象编码</span><input value={data.objectCode || ''} disabled /></label>
      </div>
    );
  }

  return (
    <div className="fp-topology-property-grid">
      <label><span>连线名称</span><input value={data.edgeName || ''} onChange={(event) => onChange('edgeName', event.target.value)} /></label>
      <InfoBox label="连线类型" value={edgeTypeText(data.edgeType)} code={data.edgeType} />
      <InfoBox label="关系类型" value={relationTypeText(data.relationType)} code={data.relationType} />
      <label><span>关系 ID</span><input value={data.relationId || ''} onChange={(event) => onChange('relationId', event.target.value)} /></label>
      <label><span>源节点</span><select value={data.sourceNodeId} onChange={(event) => onChange('sourceNodeId', event.target.value)}>{nodes.map((node) => <option key={node.id} value={node.id}>{node.nodeName}</option>)}</select></label>
      <label><span>目标节点</span><select value={data.targetNodeId} onChange={(event) => onChange('targetNodeId', event.target.value)}>{nodes.map((node) => <option key={node.id} value={node.id}>{node.nodeName}</option>)}</select></label>
    </div>
  );
}

function InfoBox({ label, value, code }) {
  return (
    <div className="fp-topology-info-box">
      <span>{label}</span>
      <strong>{value || '-'}</strong>
      {code && code !== value ? <em>{code}</em> : null}
    </div>
  );
}

const QUICK_THRESHOLD_SEVERITIES = [
  ['REMIND', '提醒'],
  ['WARNING', '警告'],
  ['ERROR', '错误'],
  ['CRITICAL', '紧急'],
];

function defaultTopologyThresholdRule(context, metric, rule = null) {
  const conditions = parseThresholdConditions(rule?.conditionsJson);
  const conditionMap = {};
  conditions.forEach((condition) => { conditionMap[condition.severity] = condition; });
  return {
    id: rule?.id || '',
    objectType: context?.objectType || 'TOPOLOGY_NODE',
    objectId: context?.objectId || '',
    objectCode: context?.objectCode || '',
    objectName: context?.objectName || '',
    metricDefinitionId: metric?.id || metric?.metricDefinitionId || '',
    ruleName: rule?.ruleName || `${context?.objectName || '拓扑元素'} - ${metric?.metricName || metric?.metricCode || '指标'}阈值`,
    conditions: QUICK_THRESHOLD_SEVERITIES.map(([severity]) => ({
      severity,
      enabled: conditionMap[severity] ? conditionMap[severity].enabled !== false : false,
      operator: conditionMap[severity]?.operator || '>=',
      value: conditionMap[severity]?.value ?? '',
    })),
    evaluationWindowSec: rule?.evaluationWindowSec || 60,
    consecutiveCount: rule?.consecutiveCount || 1,
    enabled: rule?.enabled !== false,
  };
}

function parseThresholdConditions(value) {
  try {
    const parsed = typeof value === 'string' ? JSON.parse(value || '[]') : value;
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    return [];
  }
}

function summarizeTopologyThreshold(rule) {
  if (!rule) return '未配置阈值';
  const conditions = parseThresholdConditions(rule.conditionsJson).filter((item) => item.enabled !== false);
  if (!conditions.length) return '未启用条件';
  return conditions.slice(0, 3).map((item) => `${severityText(item.severity)} ${item.operator || ''} ${item.value ?? '-'}`).join(' / ');
}

function severityText(value) {
  const map = {
    NORMAL: '正常',
    REMIND: '提醒',
    WARNING: '警告',
    ERROR: '错误',
    CRITICAL: '紧急',
    UNKNOWN: '未知',
  };
  return map[value] || value || '-';
}

function nodeTypeText(value) {
  const map = {
    RESOURCE: '资源节点',
    APPLICATION: '应用节点',
    MANUAL: '手工节点',
  };
  return map[value] || value || '-';
}

function objectTypeText(value) {
  const map = {
    KAFKA_TOPIC: 'Kafka Topic',
    KAFKA_GROUP: 'Kafka Group',
    SPARK_JOB: 'Spark 作业',
    SPARK_LOGICAL_JOB: 'Spark 逻辑作业',
    ES_INDEX: 'ES 索引',
    ES_LOGICAL_INDEX: 'ES 逻辑索引',
    KAFKA: 'Kafka',
    SPARK: 'Spark',
    ELASTICSEARCH: 'Elasticsearch',
  };
  return map[value] || value || '-';
}

function edgeTypeText(value) {
  const map = {
    DATA_FLOW: '数据流',
    DEPENDENCY: '依赖',
  };
  return map[value] || value || '-';
}

function relationTypeText(value) {
  const map = {
    KAFKA_CONSUME: 'Kafka 消费',
    ES_WRITE: '写入 ES',
    CUSTOM: '自定义',
  };
  return map[value] || value || '-';
}

function labelExecutionMode(value) {
  const map = {
    SERVER: '服务端',
    SSH: 'SSH',
    AGENT: 'Agent',
    EXPRESSION: '表达式',
  };
  return map[value] || value || '-';
}

function collectStatusText(value) {
  const map = {
    SUCCESS: '正常',
    ERROR: '异常',
    RUNNING: '采集中',
    PENDING: '待采集',
    UNKNOWN: '未采集',
  };
  return map[value] || value || '未采集';
}

function formatMetricValue(value, unit) {
  if (value === undefined || value === null || value === '') return '暂无';
  const number = Number(value);
  const display = Number.isFinite(number) ? number.toLocaleString(undefined, { maximumFractionDigits: 4 }) : String(value);
  return unit ? `${display} ${unit}` : display;
}

function formatTime(value) {
  if (!value) return '暂无';
  return new Date(value).toLocaleString();
}
