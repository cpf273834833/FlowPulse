import React, { useMemo, useState } from 'react';
import './MetricConfigEditor.css';

const EXECUTION_MODES = [
  { value: 'SERVER', label: '服务端执行' },
  { value: 'SSH', label: 'SSH 执行' },
  { value: 'AGENT', label: 'Agent 执行' },
  { value: 'EXPRESSION', label: '表达式计算' },
];

const PARAM_TYPES = [
  { value: 'STRING', label: '字符串' },
  { value: 'NUMBER', label: '数字' },
  { value: 'MILLIS_TIMESTAMP', label: '毫秒时间戳' },
  { value: 'FORMATTED_TIME', label: '格式化时间' },
];

const OPERATORS = [
  { value: 'NONE', label: '不筛选' },
  { value: '==', label: '等于' },
  { value: '!=', label: '不等于' },
  { value: '>', label: '大于' },
  { value: '>=', label: '大于等于' },
  { value: '<', label: '小于' },
  { value: '<=', label: '小于等于' },
  { value: 'CONTAINS', label: '包含' },
  { value: 'STARTS_WITH', label: '以前缀开始' },
  { value: 'REGEX', label: '正则匹配' },
];

const TRANSFORMS = [
  { value: 'NONE', label: '不转换' },
  { value: 'TIME_FORMAT', label: '时间格式转换' },
  { value: 'CONCAT', label: '字符串拼接' },
  { value: 'REGEX_EXTRACT', label: '正则提取' },
];

const MISSING_POLICIES = [
  { value: 'KEEP_PLACEHOLDER', label: '保留占位符' },
  { value: 'EMPTY', label: '置空' },
  { value: 'ERROR', label: '采集失败' },
];

export function MetricConfigEditor({
  context,
  metrics = [],
  implementations = [],
  executorNodes = [],
  draft,
  onDraft,
  onCancel,
  onSave,
}) {
  const [validationMessage, setValidationMessage] = useState('');
  const metricMap = useMemo(() => indexById(metrics), [metrics]);
  const selectedMetric = metricMap[draft?.metricDefinitionId] || null;
  const availableImplementations = useMemo(
    () => implementations.filter((item) => item.metricDefinitionId === draft?.metricDefinitionId),
    [implementations, draft?.metricDefinitionId],
  );
  const selectedImplementation = availableImplementations.find((item) => item.id === draft?.implementationId)
    || availableImplementations.find((item) => item.defaultImplementation)
    || availableImplementations[0]
    || null;
  const lockedExecutionMode = isJavaBuiltinImplementation(selectedImplementation);
  const effectiveExecutionMode = lockedExecutionMode
    ? selectedImplementation?.executionMode || 'SERVER'
    : draft?.executionMode || selectedImplementation?.executionMode || 'SERVER';

  if (!draft) return null;

  function defaultImplementationForMetric(metricDefinitionId) {
    return implementations.find((item) => item.metricDefinitionId === metricDefinitionId && item.defaultImplementation)
      || implementations.find((item) => item.metricDefinitionId === metricDefinitionId)
      || null;
  }

  function update(patch) {
    onDraft({ ...draft, ...patch });
  }

  function handleMetricChange(metricDefinitionId) {
    const metric = metrics.find((item) => item.id === metricDefinitionId);
    const implementation = defaultImplementationForMetric(metricDefinitionId);
    update({
      metricDefinitionId,
      implementationId: implementation?.id || '',
      executionMode: implementation?.executionMode || draft.executionMode || 'SERVER',
      parameterJson: '',
      displayName: draft.displayName || defaultMetricDisplayName(metric),
    });
  }

  function handleImplementationChange(implementationId) {
    const implementation = implementations.find((item) => item.id === implementationId);
    update({
      implementationId,
      executionMode: implementation?.executionMode || draft.executionMode || 'SERVER',
      parameterJson: '',
    });
  }

  function handleSave() {
    if (effectiveExecutionMode === 'SSH' && !draft.executorNodeId) {
      setValidationMessage('SSH 执行方式必须选择执行节点。');
      return;
    }
    const schema = mergeParameterSchemas(selectedMetric, selectedImplementation);
    const config = normalizeMetricParameterConfig(parseJsonObject(draft.parameterJson), context, schema);
    const validation = validateMetricParameterConfig(selectedMetric, selectedImplementation, config);
    if (validation) {
      setValidationMessage(validation);
      return;
    }
    setValidationMessage('');
    onSave({ ...draft, executionMode: effectiveExecutionMode, parameterJson: stringifyJson(config) });
  }

  function handleResetConfig() {
    setValidationMessage('');
    const schema = mergeParameterSchemas(selectedMetric, selectedImplementation);
    const config = normalizeMetricParameterConfig({}, context, schema);
    onDraft({ ...draft, parameterJson: stringifyJson(config) });
  }

  const requiresExecutorNode = effectiveExecutionMode === 'SSH';

  return (
    <section className="fp-metric-config-editor">
      <header className="fp-metric-config-editor__head">
        <div>
          <strong>{draft.id ? '修改指标配置' : '启用指标'}</strong>
          <span>{contextLabel(context)}</span>
        </div>
        <button className="fp-link-button" type="button" onClick={onCancel}>收起</button>
      </header>

      <div className="fp-metric-config-editor__grid">
        <label>
          <span>指标定义</span>
          <select value={draft.metricDefinitionId || ''} onChange={(event) => handleMetricChange(event.target.value)}>
            <option value="">请选择指标</option>
            {metrics.map((metric) => (
              <option key={metric.id} value={metric.id}>{metric.metricName} / {metric.metricCode}</option>
            ))}
          </select>
        </label>
        <label>
          <span>采集实现</span>
          <select value={draft.implementationId || selectedImplementation?.id || ''} onChange={(event) => handleImplementationChange(event.target.value)}>
            <option value="">默认实现</option>
            {availableImplementations.map((implementation) => (
              <option key={implementation.id} value={implementation.id}>{implementation.implementationName}</option>
            ))}
          </select>
        </label>
        <label>
          <span>执行方式</span>
          <select
            value={effectiveExecutionMode}
            disabled={lockedExecutionMode}
            title={lockedExecutionMode ? 'Java 内置采集实现由系统固定执行方式' : ''}
            onChange={(event) => update({ executionMode: event.target.value })}
          >
            {EXECUTION_MODES.map((mode) => <option key={mode.value} value={mode.value}>{mode.label}</option>)}
          </select>
          {lockedExecutionMode ? <small className="fp-field-tip">Java 内置实现固定为系统执行方式，不允许修改。</small> : null}
        </label>
        {requiresExecutorNode ? (
          <label>
            <span>执行节点</span>
            <select value={draft.executorNodeId || ''} onChange={(event) => update({ executorNodeId: event.target.value })}>
              <option value="">请选择执行节点</option>
              {executorNodes.map((node) => (
                <option key={node.id} value={node.id}>{executorNodeLabel(node)}</option>
              ))}
            </select>
          </label>
        ) : null}
        <label>
          <span>采集周期</span>
          <input type="number" min="10" value={draft.intervalSec || 60} onChange={(event) => update({ intervalSec: Number(event.target.value) })} />
        </label>
        <label>
          <span>状态</span>
          <select value={String(draft.enabled !== false)} onChange={(event) => update({ enabled: event.target.value === 'true' })}>
            <option value="true">启用</option>
            <option value="false">停用</option>
          </select>
        </label>
        <label>
          <span>拓扑展示</span>
          <select value={String(draft.showOnTopology !== false)} onChange={(event) => update({ showOnTopology: event.target.value === 'true' })}>
            <option value="true">展示</option>
            <option value="false">不展示</option>
          </select>
        </label>
        <label>
          <span>显示名称</span>
          <input
            maxLength="64"
            value={draft.displayName || ''}
            placeholder={defaultMetricDisplayName(selectedMetric)}
            onChange={(event) => update({ displayName: event.target.value })}
          />
          <small className="fp-field-tip">拓扑图展示短名称，例如：积压、状态、提交。</small>
        </label>
        <label>
          <span>展示排序</span>
          <input
            type="number"
            value={draft.displayOrder ?? 100}
            onChange={(event) => update({ displayOrder: Number(event.target.value) })}
          />
          <small className="fp-field-tip">数字越小越优先；异常指标会自动排在正常指标前。</small>
        </label>
      </div>

      {metrics.length === 0 ? (
        <div className="fp-metric-config-empty">
          当前元素没有可配置指标。请先在指标中心维护适用范围。
        </div>
      ) : null}
      {validationMessage ? <div className="fp-metric-config-error">{validationMessage}</div> : null}

      <MetricParameterEditor
        context={context}
        metric={selectedMetric}
        implementation={selectedImplementation}
        draft={draft}
        onDraft={onDraft}
      />

      <footer className="fp-actions fp-metric-config-editor__actions">
        <button className="fp-button" type="button" onClick={handleResetConfig}>重置配置</button>
        <button className="fp-button" type="button" onClick={onCancel}>取消</button>
        <button className="fp-button fp-button--primary" type="button" onClick={handleSave}>保存指标配置</button>
      </footer>
    </section>
  );
}

function isJavaBuiltinImplementation(implementation) {
  if (!implementation) return false;
  return implementation.systemBuiltin === true
    || implementation.implementationType === 'JAVA'
    || implementation.implementationType === 'BUILT_IN'
    || Boolean(implementation.builtInCollector);
}

export function MetricParameterEditor({ context, metric, implementation, draft, onDraft }) {
  const schema = useMemo(() => mergeParameterSchemas(metric, implementation), [metric, implementation]);
  const config = normalizeMetricParameterConfig(parseJsonObject(draft.parameterJson), context, schema);

  function updateConfig(nextConfig) {
    onDraft({ ...draft, parameterJson: stringifyJson(nextConfig) });
  }

  function updateParameter(paramKey, patch) {
    const current = config.parameters[paramKey] || {};
    const nextParameters = {
      ...config.parameters,
      [paramKey]: normalizeParameterConfig({ ...current, ...patch }, schema[paramKey], context),
    };
    updateConfig(syncTemplateAndResolvers({ ...config, parameters: nextParameters }));
  }

  function updatePlaceholder(paramKey, placeholder, patch) {
    const current = config.parameters[paramKey] || normalizeParameterConfig({}, schema[paramKey], context);
    const nextPlaceholder = normalizePlaceholderRule(
      { ...(current.placeholders[placeholder] || {}), placeholder, ...patch },
      context,
    );
    updateParameter(paramKey, {
      placeholders: {
        ...current.placeholders,
        [placeholder]: nextPlaceholder,
      },
    });
  }

  const parameterKeys = Object.keys(schema);

  return (
    <div className="fp-metric-param-card">
      <div className="fp-metric-param-card__title">
        <div>
          <strong>参数配置</strong>
          <span>固定值直接输入；动态值使用 {'{xxx}'} 占位符，再为每个占位符选择字段来源、过滤规则和转换方式。</span>
        </div>
        <span className="fp-metric-param-count">{parameterKeys.length} 个参数</span>
      </div>

      {parameterKeys.length === 0 ? (
        <div className="fp-metric-config-empty">当前指标和采集实现未声明参数，保存时会使用空参数。</div>
      ) : null}

      <div className="fp-param-list">
        {parameterKeys.map((paramKey) => {
          const definition = schema[paramKey];
          const parameter = config.parameters[paramKey];
          const placeholders = detectPlaceholders(parameter.template);
          const directFieldOptions = fieldOptionsForSource(parameter.sourceType, context, definition);
          const directFieldSelected = directFieldOptions.some((option) => option.value === parameter.fieldName) ? parameter.fieldName : '__CUSTOM__';
          const useDirectFieldSelect = parameter.valueMode === 'FIELD' && directFieldOptions.length > 0;
          return (
            <section className="fp-param-item" key={paramKey}>
              <div className="fp-param-item__head">
                <div>
                  <strong>{definition.label || paramKey}</strong>
                  <span>{definition.description || definition.helpText || `参数键：${paramKey}`}</span>
                </div>
                {definition.required ? <em>必填</em> : <span>可选</span>}
              </div>

              <div className="fp-param-template-row">
                <label>
                  <span>取值方式</span>
                  <select value={parameter.valueMode} onChange={(event) => {
                    const valueMode = event.target.value;
                    const sourceType = valueMode === 'FIELD' ? defaultSourceType(context) : parameter.sourceType;
                    const options = fieldOptionsForSource(sourceType, context, definition);
                    updateParameter(paramKey, {
                      valueMode,
                      sourceType,
                      fieldName: valueMode === 'FIELD' ? (options[0]?.value || '') : parameter.fieldName,
                    });
                  }}>
                    <option value="FIXED">固定值</option>
                    <option value="FIELD">资源字段</option>
                    <option value="TEMPLATE">模板占位符</option>
                  </select>
                </label>
                <label>
                  <span>{parameter.valueMode === 'TEMPLATE' ? '参数模板' : '参数值'}</span>
                  <input
                    value={parameter.template}
                    disabled={parameter.valueMode === 'FIELD'}
                    placeholder={definition.placeholder || definition.example || '固定值或 {字段占位符}'}
                    onChange={(event) => updateParameter(paramKey, { template: event.target.value })}
                  />
                  <small>{parameterTemplateHint(definition)}</small>
                </label>
                <label>
                  <span>参数类型</span>
                  <select value={parameter.dataType} onChange={(event) => updateParameter(paramKey, { dataType: event.target.value })}>
                    {PARAM_TYPES.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                  </select>
                </label>
              </div>

              {parameter.valueMode === 'FIELD' ? (
                <div className="fp-param-direct-field">
                  <label>
                    <span>字段来源</span>
                    <select value={parameter.sourceType} onChange={(event) => {
                      const sourceType = event.target.value;
                      const options = fieldOptionsForSource(sourceType, context, definition);
                      updateParameter(paramKey, { sourceType, fieldName: options[0]?.value || '' });
                    }}>
                      {placeholderSourceOptions(context).filter((option) => option.value !== 'FIXED_VALUE').map((option) => (
                        <option key={option.value} value={option.value}>{option.label}</option>
                      ))}
                    </select>
                  </label>
                  <label>
                    <span>字段名</span>
                    {useDirectFieldSelect ? (
                      <select value={directFieldSelected} onChange={(event) => updateParameter(paramKey, { fieldName: event.target.value === '__CUSTOM__' ? '' : event.target.value })}>
                        {directFieldOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                        <option value="__CUSTOM__">自定义字段...</option>
                      </select>
                    ) : null}
                    {!useDirectFieldSelect || directFieldSelected === '__CUSTOM__' ? (
                      <input value={parameter.fieldName} placeholder={fieldPlaceholderForSource(parameter.sourceType)} onChange={(event) => updateParameter(paramKey, { fieldName: event.target.value })} />
                    ) : null}
                  </label>
                  <small>保存后会直接把该字段值作为参数值，不需要再写 {'{占位符}'}。</small>
                </div>
              ) : null}

              {parameter.valueMode === 'TEMPLATE' && placeholders.length > 0 ? (
                <div className="fp-placeholder-panel">
                  <div className="fp-placeholder-panel__head">
                    <strong>检测到占位符</strong>
                    <span>{placeholders.map((item) => `{${item}}`).join('、')}</span>
                  </div>
                  {placeholders.map((placeholder) => (
                    <PlaceholderRuleEditor
                      key={placeholder}
                      context={context}
                      placeholder={placeholder}
                      definition={definition}
                      rule={parameter.placeholders[placeholder] || normalizePlaceholderRule({ placeholder }, context)}
                      onChange={(patch) => updatePlaceholder(paramKey, placeholder, patch)}
                    />
                  ))}
                </div>
              ) : null}

              {parameter.valueMode === 'TEMPLATE' && placeholders.length === 0 ? (
                <div className="fp-param-hint">未检测到占位符，该模板会按固定文本传入。</div>
              ) : null}

              {parameter.valueMode === 'FIXED' ? (
                <div className="fp-param-hint">未检测到占位符，该参数会按固定值传入。</div>
              ) : null}
            </section>
          );
        })}
      </div>

      <details className="fp-param-advanced">
        <summary>高级 JSON 预览</summary>
        <textarea value={stringifyJson(syncTemplateAndResolvers(config))} onChange={(event) => updateConfig(parseJsonObject(event.target.value))} />
      </details>
    </div>
  );
}

function PlaceholderRuleEditor({ context, placeholder, definition, rule, onChange }) {
  const fieldOptions = fieldOptionsForSource(rule.sourceType, context, definition);
  const selectedField = fieldOptions.some((option) => option.value === rule.fieldName) ? rule.fieldName : '__CUSTOM__';
  const useFieldSelect = rule.sourceType !== 'FIXED_VALUE' && fieldOptions.length > 0;

  return (
    <div className="fp-placeholder-rule">
      <div className="fp-placeholder-rule__name">
        <strong>{placeholder}</strong>
        <span>占位符规则</span>
      </div>
      <label>
        <span>类型</span>
        <select value={rule.dataType} onChange={(event) => onChange({ dataType: event.target.value })}>
          {PARAM_TYPES.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
        </select>
      </label>
      <label>
        <span>规则</span>
        <select value={rule.operator} onChange={(event) => onChange({ operator: event.target.value })}>
          {OPERATORS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
        </select>
      </label>
      <label>
        <span>比较值</span>
        <input
          value={rule.compareValue || ''}
          disabled={rule.operator === 'NONE'}
          placeholder={rule.operator === 'NONE' ? '未启用过滤' : '固定值或 {占位符}'}
          onChange={(event) => onChange({ compareValue: event.target.value })}
        />
      </label>
      <label>
        <span>来源</span>
        <select value={rule.sourceType} onChange={(event) => {
          const sourceType = event.target.value;
          const nextFieldOptions = fieldOptionsForSource(sourceType, context, definition);
          onChange({ sourceType, fieldName: nextFieldOptions[0]?.value || '' });
        }}>
          {placeholderSourceOptions(context).map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
        </select>
      </label>
      <label>
        <span>{rule.sourceType === 'FIXED_VALUE' ? '固定值' : '字段名'}</span>
        {rule.sourceType === 'FIXED_VALUE' ? (
          <input value={rule.value} onChange={(event) => onChange({ value: event.target.value })} />
        ) : null}
        {useFieldSelect ? (
          <select value={selectedField} onChange={(event) => onChange({ fieldName: event.target.value === '__CUSTOM__' ? '' : event.target.value })}>
            {fieldOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            <option value="__CUSTOM__">自定义字段...</option>
          </select>
        ) : null}
        {rule.sourceType !== 'FIXED_VALUE' && (!useFieldSelect || selectedField === '__CUSTOM__') ? (
          <input
            value={rule.fieldName}
            placeholder={fieldPlaceholderForSource(rule.sourceType)}
            onChange={(event) => onChange({ fieldName: event.target.value })}
          />
        ) : null}
      </label>
      <label>
        <span>值转换</span>
        <select value={rule.transform.type} onChange={(event) => onChange({ transform: normalizeTransform({ ...rule.transform, type: event.target.value }) })}>
          {TRANSFORMS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
        </select>
      </label>
      <TransformFields transform={rule.transform} onChange={(transform) => onChange({ transform })} />
      <label>
        <span>缺失处理</span>
        <select value={rule.missingPolicy} onChange={(event) => onChange({ missingPolicy: event.target.value })}>
          {MISSING_POLICIES.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
        </select>
      </label>
    </div>
  );
}

function TransformFields({ transform, onChange }) {
  if (!transform || transform.type === 'NONE') return null;
  if (transform.type === 'TIME_FORMAT') {
    return (
      <>
        <label>
          <span>输入格式</span>
          <input value={transform.inputFormat || 'millis'} onChange={(event) => onChange(normalizeTransform({ ...transform, inputFormat: event.target.value }))} />
        </label>
        <label>
          <span>输出格式</span>
          <input value={transform.outputFormat || 'yyyyMMddHHmmss'} onChange={(event) => onChange(normalizeTransform({ ...transform, outputFormat: event.target.value }))} />
        </label>
      </>
    );
  }
  if (transform.type === 'CONCAT') {
    return (
      <>
        <label>
          <span>前缀</span>
          <input value={transform.prefix || ''} onChange={(event) => onChange(normalizeTransform({ ...transform, prefix: event.target.value }))} />
        </label>
        <label>
          <span>后缀</span>
          <input value={transform.suffix || ''} onChange={(event) => onChange(normalizeTransform({ ...transform, suffix: event.target.value }))} />
        </label>
      </>
    );
  }
  return (
    <>
      <label>
        <span>正则</span>
        <input value={transform.regex || ''} placeholder="例如 (\\d{14})$" onChange={(event) => onChange(normalizeTransform({ ...transform, regex: event.target.value }))} />
      </label>
      <label>
        <span>分组</span>
        <input type="number" min="0" value={transform.groupIndex ?? 1} onChange={(event) => onChange(normalizeTransform({ ...transform, groupIndex: Number(event.target.value) }))} />
      </label>
    </>
  );
}

export function normalizeMetricParameterConfig(value = {}, context, schema = {}) {
  const legacyTemplate = value.template && typeof value.template === 'object' && !Array.isArray(value.template) ? value.template : {};
  const legacyResolvers = Array.isArray(value.resolvers) ? value.resolvers : [];
  const rawParameters = value.parameters && typeof value.parameters === 'object' && !Array.isArray(value.parameters) ? value.parameters : {};
  const parameters = {};

  Object.keys(schema).forEach((key) => {
    const fromLegacyTemplate = legacyTemplate[key] !== undefined ? String(legacyTemplate[key]) : '';
    const current = rawParameters[key] || { template: fromLegacyTemplate };
    parameters[key] = normalizeParameterConfig(current, schema[key], context, legacyResolvers);
  });

  Object.keys(rawParameters).forEach((key) => {
    if (!parameters[key]) {
      parameters[key] = normalizeParameterConfig(rawParameters[key], { key }, context, legacyResolvers);
    }
  });

  return syncTemplateAndResolvers({
    parameters,
  });
}

function normalizeParameterConfig(value = {}, definition = {}, context, legacyResolvers = []) {
  const template = value.template !== undefined ? String(value.template) : String(definition.defaultValue ?? definition.template ?? '');
  const valueMode = normalizeValueMode(value.valueMode || value.mode, template);
  const sourceType = value.sourceType || defaultSourceType(context);
  const fieldName = value.fieldName || '';
  const placeholders = {};
  const rawPlaceholders = value.placeholders && typeof value.placeholders === 'object' ? value.placeholders : {};

  detectPlaceholders(template).forEach((placeholder) => {
    const legacy = legacyResolvers.find((item) => item.placeholder === placeholder) || {};
    const schemaRule = placeholderRuleFromSchema(definition, placeholder);
    placeholders[placeholder] = normalizePlaceholderRule(
      { placeholder, ...schemaRule, ...legacy, ...(rawPlaceholders[placeholder] || {}) },
      context,
    );
  });

  Object.keys(rawPlaceholders).forEach((placeholder) => {
    if (!placeholders[placeholder]) {
      placeholders[placeholder] = normalizePlaceholderRule({ placeholder, ...rawPlaceholders[placeholder] }, context);
    }
  });

  return {
    key: definition.key || value.key || '',
    label: definition.label || value.label || '',
    required: definition.required !== false,
    dataType: value.dataType || definition.dataType || 'STRING',
    valueMode,
    sourceType,
    fieldName,
    template,
    placeholders,
  };
}

function normalizeValueMode(value, template = '') {
  if (value === 'FIELD' || value === 'TEMPLATE') return value;
  if (detectPlaceholders(template).length > 0) return 'TEMPLATE';
  return 'FIXED';
}

function normalizePlaceholderRule(value = {}, context) {
  return {
    placeholder: value.placeholder || '',
    dataType: value.dataType || 'STRING',
    operator: value.operator || 'NONE',
    sourceType: value.sourceType || defaultSourceType(context),
    fieldName: value.fieldName || '',
    value: value.value || '',
    compareValue: value.compareValue || '',
    missingPolicy: value.missingPolicy || 'KEEP_PLACEHOLDER',
    transform: normalizeTransform(value.transform || { type: transformTypeFromLegacy(value) }),
  };
}

function normalizeTransform(value = {}) {
  const type = value.type || 'NONE';
  if (type === 'TIME_FORMAT') {
    return { type, inputFormat: value.inputFormat || 'millis', outputFormat: value.outputFormat || value.format || 'yyyyMMddHHmmss' };
  }
  if (type === 'CONCAT') {
    return { type, prefix: value.prefix || '', suffix: value.suffix || '' };
  }
  if (type === 'REGEX_EXTRACT') {
    return { type, regex: value.regex || '', groupIndex: value.groupIndex ?? 1 };
  }
  return { type: 'NONE' };
}

function syncTemplateAndResolvers(config) {
  const template = {};
  const resolvers = [];
  Object.keys(config.parameters || {}).forEach((key) => {
    const parameter = config.parameters[key];
    template[key] = parameter.valueMode === 'FIELD' ? `{${key}}` : parameter.template;
    if (parameter.valueMode === 'FIELD') {
      resolvers.push({
        placeholder: key,
        parameterKey: key,
        sourceType: parameter.sourceType,
        fieldName: parameter.fieldName,
        value: '',
        format: '',
        dataType: parameter.dataType,
        operator: 'NONE',
        compareValue: '',
        missingPolicy: 'KEEP_PLACEHOLDER',
        transform: { type: 'NONE' },
      });
    }
    Object.keys(parameter.placeholders || {}).forEach((placeholder) => {
      const rule = parameter.placeholders[placeholder];
      resolvers.push({
        placeholder,
        parameterKey: key,
        sourceType: rule.sourceType,
        fieldName: rule.fieldName,
        value: rule.value,
        format: transformFormat(rule.transform),
        dataType: rule.dataType,
        operator: rule.operator,
        compareValue: rule.compareValue,
        missingPolicy: rule.missingPolicy,
        transform: rule.transform,
      });
    });
  });
  return { ...config, template, resolvers };
}

function mergeParameterSchemas(metric, implementation) {
  const metricSchema = parseParameterSchema(metric?.parameterSchemaJson);
  const implementationSchema = parseParameterSchema(implementation?.parameterSchemaJson);
  return { ...metricSchema, ...implementationSchema };
}

function parseParameterSchema(value) {
  const parsed = parseJsonObject(value);
  const source = Array.isArray(parsed.parameters) ? parsed.parameters : parsed;
  const schema = {};
  if (Array.isArray(source)) {
    source.forEach((item) => {
      const key = item.key || item.name || item.parameterKey;
      if (key) schema[key] = normalizeSchemaItem(key, item);
    });
    return schema;
  }
  Object.keys(source || {}).forEach((key) => {
    const item = typeof source[key] === 'object' && source[key] !== null ? source[key] : { defaultValue: source[key] };
    schema[key] = normalizeSchemaItem(key, item);
  });
  return schema;
}

function validateMetricParameterConfig(metric, implementation, config) {
  const metricSchema = parseParameterSchema(metric?.parameterSchemaJson);
  const implementationSchema = parseParameterSchema(implementation?.parameterSchemaJson);
  const missingImplementationParams = Object.keys(metricSchema).filter((key) => metricSchema[key].required && !implementationSchema[key]);
  if (missingImplementationParams.length > 0) {
    return `当前采集实现缺少指标定义必需参数：${missingImplementationParams.join('、')}`;
  }
  const schema = mergeParameterSchemas(metric, implementation);
  const missingConfigParams = Object.keys(schema).filter((key) => {
    if (!schema[key].required) return false;
    const parameter = config.parameters[key] || {};
    if (parameter.valueMode === 'FIELD') {
      return !String(parameter.fieldName || '').trim();
    }
    return !String(parameter.template || '').trim();
  });
  if (missingConfigParams.length > 0) {
    return `请先配置必填参数：${missingConfigParams.join('、')}`;
  }
  return '';
}

function normalizeSchemaItem(key, item) {
  return {
    key,
    label: item.label || item.title || item.name || key,
    required: item.required !== false,
    dataType: item.dataType || item.type || 'STRING',
    defaultValue: item.defaultValue ?? item.default ?? '',
    template: item.template || '',
    placeholder: item.placeholder || '',
    description: item.description || '',
    helpText: item.helpText || item.guide || '',
    example: item.example || (Array.isArray(item.examples) ? item.examples[0] : ''),
    placeholders: item.placeholders || item.placeholderRules || {},
    fields: item.fields || item.fieldOptions || [],
    fieldsBySource: item.fieldsBySource || item.fieldOptionsBySource || {},
  };
}

function placeholderRuleFromSchema(definition = {}, placeholder) {
  const rules = definition.placeholders || {};
  const rule = rules[placeholder] || rules[`{${placeholder}}`] || {};
  return {
    sourceType: rule.sourceType || definition.defaultSourceType || definition.sourceType,
    fieldName: rule.fieldName || definition.defaultFieldName || definition.fieldName,
    value: rule.value || '',
    dataType: rule.dataType || definition.dataType,
    operator: rule.operator || definition.operator,
    compareValue: rule.compareValue || definition.compareValue,
    missingPolicy: rule.missingPolicy || definition.missingPolicy,
    transform: rule.transform || definition.transform,
  };
}

function detectPlaceholders(value) {
  const text = String(value || '');
  const matches = text.matchAll(/\{([A-Za-z0-9_.-]+)}/g);
  return Array.from(new Set(Array.from(matches).map((match) => match[1])));
}

function transformFormat(transform) {
  if (!transform || transform.type !== 'TIME_FORMAT') return '';
  return transform.outputFormat || '';
}

function transformTypeFromLegacy(value) {
  if (value.format) return 'TIME_FORMAT';
  return 'NONE';
}

function executorNodeLabel(node) {
  if (!node) return '-';
  const host = node.host || node.ip || node.hostAddress || node.nodeIp || node.id;
  const region = node.regionName || node.envName || '';
  return region ? `${host} / ${region}` : host;
}

function placeholderSourceOptions(context) {
  const options = [
    { value: 'FIXED_VALUE', label: '固定值' },
    { value: 'CURRENT_TIME_MILLIS', label: '当前时间毫秒戳' },
    { value: 'CURRENT_TIME_FORMATTED', label: '当前时间格式化' },
    { value: 'INFRA_CONNECTION_FIELD', label: '基础设施连接字段' },
    { value: 'CURRENT_RESOURCE_FIELD', label: '当前资源对象字段' },
  ];
  if (context?.topologyElementType === 'EDGE') {
    options.push(
      { value: 'SOURCE_NODE_RESOURCE_FIELD', label: '源节点资源字段' },
      { value: 'TARGET_NODE_RESOURCE_FIELD', label: '目标节点资源字段' },
      { value: 'TOPOLOGY_EDGE_FIELD', label: '连线字段' },
    );
  }
  return options;
}

function fieldOptionsForSource(sourceType, context, definition = {}) {
  const schemaOptions = optionsForSourceFromSchema(definition, sourceType);
  if (schemaOptions.length > 0) return schemaOptions;

  if (sourceType === 'INFRA_CONNECTION_FIELD') {
    return [
      { value: 'infrastructureCode', label: '基础设施编码 / infrastructureCode' },
      { value: 'infrastructureName', label: '基础设施名称 / infrastructureName' },
      { value: 'type', label: '基础设施类型 / type' },
      { value: 'endpoint', label: '连接地址 / endpoint' },
      { value: 'authType', label: '认证方式 / authType' },
      { value: 'username', label: '用户名 / username' },
      { value: 'apiKey', label: 'API Key / apiKey' },
    ];
  }
  if (sourceType === 'TOPOLOGY_EDGE_FIELD') {
    return [
      { value: 'edgeKey', label: '连线编码 / edgeKey' },
      { value: 'edgeName', label: '连线名称 / edgeName' },
      { value: 'edgeType', label: '连线类型 / edgeType' },
      { value: 'relationType', label: '关系类型 / relationType' },
      { value: 'relationId', label: '真实关系 ID / relationId' },
    ];
  }
  if (sourceType === 'SOURCE_NODE_RESOURCE_FIELD' || sourceType === 'TARGET_NODE_RESOURCE_FIELD') {
    const prefix = sourceType === 'SOURCE_NODE_RESOURCE_FIELD' ? '源节点' : '目标节点';
    return resourceFieldOptions(prefix);
  }
  if (sourceType === 'CURRENT_RESOURCE_FIELD') {
    return resourceFieldOptions('');
  }
  if (sourceType === 'CURRENT_TIME_MILLIS' || sourceType === 'CURRENT_TIME_FORMATTED') {
    return [];
  }
  return context?.topologyElementType === 'EDGE'
    ? fieldOptionsForSource('SOURCE_NODE_RESOURCE_FIELD', context, definition)
    : fieldOptionsForSource('CURRENT_RESOURCE_FIELD', context, definition);
}

function resourceFieldOptions(prefix) {
  const labelPrefix = prefix || '';
  return [
    { value: 'objectCode', label: `${labelPrefix}对象编码 / objectCode` },
    { value: 'resourceCode', label: `${labelPrefix}资源编码 / resourceCode` },
    { value: 'code', label: `${labelPrefix}编码别名 / code` },
    { value: 'objectName', label: `${labelPrefix}对象名称 / objectName` },
    { value: 'resourceName', label: `${labelPrefix}资源名称 / resourceName` },
    { value: 'objectType', label: `${labelPrefix}对象类型 / objectType` },
    { value: 'resourceType', label: `${labelPrefix}资源类型 / resourceType` },
    { value: 'objectId', label: `${labelPrefix}对象 ID / objectId` },
    { value: 'resourceId', label: `${labelPrefix}资源 ID / resourceId` },
    { value: 'status', label: `${labelPrefix}状态 / status` },
    { value: 'lastSyncAt', label: `${labelPrefix}最近同步时间 / lastSyncAt` },
    { value: 'startedTime', label: `${labelPrefix}启动时间 / startedTime` },
    { value: 'startTime', label: `${labelPrefix}启动时间 / startTime` },
    { value: 'applicationId', label: `${labelPrefix}应用 ID / applicationId` },
  ];
}

function optionsForSourceFromSchema(definition = {}, sourceType) {
  const sourceFields = definition.fieldsBySource?.[sourceType] || [];
  const raw = sourceFields.length > 0 ? sourceFields : definition.fields;
  return normalizeFieldOptions(raw);
}

function normalizeFieldOptions(items) {
  if (!Array.isArray(items)) return [];
  return items.map((item) => {
    if (typeof item === 'string') return { value: item, label: item };
    const value = item.value || item.fieldName || item.name || item.key || '';
    const label = item.label || item.title || item.name || item.fieldName || item.value || value;
    return { value, label };
  }).filter((item) => item.value);
}

function fieldPlaceholderForSource(sourceType) {
  if (sourceType === 'INFRA_CONNECTION_FIELD') return '例如 endpoint';
  if (sourceType === 'TOPOLOGY_EDGE_FIELD') return '例如 relationType';
  if (sourceType === 'TARGET_NODE_RESOURCE_FIELD') return '例如 startedTime';
  return '例如 resourceCode';
}

function defaultSourceType(context) {
  return context?.topologyElementType === 'EDGE' ? 'SOURCE_NODE_RESOURCE_FIELD' : 'CURRENT_RESOURCE_FIELD';
}

function contextLabel(context) {
  const elementType = context?.topologyElementType === 'EDGE' ? '连线' : '节点';
  return `${elementType} / ${labelObjectType(context?.objectType)}`;
}

function labelObjectType(value) {
  const map = {
    KAFKA_TOPIC: 'Kafka Topic',
    KAFKA_GROUP: 'Kafka Group',
    SPARK_JOB: 'Spark 作业',
    SPARK_LOGICAL_JOB: 'Spark 逻辑作业',
    ES_INDEX: 'ES 索引',
    ES_LOGICAL_INDEX: 'ES 逻辑索引',
    TOPOLOGY_EDGE: '拓扑连线',
    TOPOLOGY_NODE: '拓扑节点',
    INFRASTRUCTURE: '基础设施',
  };
  return map[value] || value || '-';
}

function parameterTemplateHint(definition = {}) {
  if (definition.helpText) return definition.helpText;
  if (definition.example) return `示例：${definition.example}`;
  return '固定值会原样传入；包含 {xxx} 时，下方会出现占位符来源配置。';
}

function parseJsonObject(value) {
  try {
    const parsed = typeof value === 'string' ? JSON.parse(value || '{}') : value;
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
  } catch (error) {
    return {};
  }
}

function stringifyJson(value) {
  return JSON.stringify(value || {}, null, 2);
}

function indexById(items) {
  const map = {};
  items.forEach((item) => { map[item.id] = item; });
  return map;
}

function defaultMetricDisplayName(metric) {
  const name = metric?.metricName || metric?.metricCode || '';
  return compactMetricDisplayName(name);
}

function compactMetricDisplayName(name) {
  const normalized = String(name || '')
    .replace(/^Kafka\s*/i, '')
    .replace(/^Spark\s*/i, '')
    .replace(/^ES\s*/i, '')
    .replace(/\s+/g, '');
  return normalized.length > 8 ? normalized.slice(0, 8) : normalized;
}
