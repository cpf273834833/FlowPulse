import React, { useEffect, useMemo, useState } from 'react';
import PlusOutlined from '@uyun/icons/PlusOutlined';
import SearchOutlined from '@uyun/icons/SearchOutlined';
import { metricApi } from '../../api/metricApi';
import Pagination from '../../components/Pagination';
import { t } from '../../i18n';

const EMPTY_CONFIG_PAGE = { configs: { records: [], total: 0, pageNo: 1, pageSize: 10 }, stats: [] };

export default function ResourceMetricConfigPanel({ objectContext, metrics, implementations, onMessage }) {
  const [page, setPage] = useState(EMPTY_CONFIG_PAGE);
  const [query, setQuery] = useState({ pageNo: 1, pageSize: 10 });
  const [editing, setEditing] = useState(null);

  useEffect(() => {
    load({ pageNo: 1, pageSize: 10 });
  }, [objectContext && objectContext.objectId]);

  async function load(nextQuery = query) {
    const scoped = objectContext && objectContext.objectId ? { ...nextQuery, objectType: objectContext.objectType, objectId: objectContext.objectId } : nextQuery;
    const data = await metricApi.resourceConfigPage(scoped);
    setPage(data || EMPTY_CONFIG_PAGE);
    setQuery(nextQuery);
  }

  async function save(form) {
    const payload = normalizeConfigPayload(form, objectContext);
    if (form.id) {
      await metricApi.updateResourceConfig(form.id, payload);
    } else {
      await metricApi.createResourceConfig(payload);
    }
    setEditing(null);
    onMessage && onMessage(t('metric.resourceConfigSaved'));
    await load(query);
  }

  return (
    <section className="fp-card fp-metric-config-panel">
      <div className="fp-section-title">
        <div>
          <h2>{t('metric.resourceConfig')}</h2>
          <p>{t('metric.resourceConfigDesc')}</p>
        </div>
        <button className="fp-button fp-button--primary" type="button" onClick={() => setEditing(defaultConfig(objectContext))}><PlusOutlined />{t('metric.addResourceConfig')}</button>
      </div>
      {!objectContext ? (
        <div className="fp-filter-row fp-filter-row--metric-config">
          <div className="fp-inline-search">
            <SearchOutlined />
            <input value={query.keyword || ''} placeholder={t('metric.searchTask')} onChange={(event) => setQuery({ ...query, keyword: event.target.value, pageNo: 1 })} onKeyDown={(event) => { if (event.key === 'Enter') load({ ...query, pageNo: 1 }); }} />
          </div>
          <button className="fp-button" type="button" onClick={() => load({ ...query, pageNo: 1 })}>{t('filter')}</button>
        </div>
      ) : null}
      <div className="fp-data-table fp-resource-metric-table">
        <div className="fp-data-table__row fp-data-table__row--head">
          <span>{t('metric.object')}</span>
          <span>{t('metric.name')}</span>
          <span>{t('metric.implementation')}</span>
          <span>{t('metric.executionMode')}</span>
          <span>{t('metric.interval')}</span>
          <span>{t('metric.collectStatus')}</span>
          <span>{t('operation')}</span>
        </div>
        {page.configs.records.length === 0 ? <div className="fp-empty">{t('empty')}</div> : null}
        {page.configs.records.map((item) => (
          <div className="fp-data-table__row" key={item.id}>
            <span>{item.objectName}<em>{item.objectCode}</em></span>
            <span>{item.metricName}<em>{item.metricCode}</em></span>
            <span>{item.implementationName || '-'}</span>
            <span>{labelExecution(item.executionMode)}</span>
            <span>{item.intervalSec}s</span>
            <span>{labelCollect(item.lastCollectStatus)}</span>
            <button className="fp-link-button" type="button" onClick={() => setEditing(item)}>{t('edit')}</button>
          </div>
        ))}
      </div>
      <Pagination pageNo={page.configs.pageNo} pageSize={page.configs.pageSize} total={page.configs.total} onChange={(next) => load({ ...query, ...next })} />
      {editing ? <ResourceMetricConfigEditor form={editing} metrics={metrics} implementations={implementations} onCancel={() => setEditing(null)} onSubmit={save} /> : null}
    </section>
  );
}

function ResourceMetricConfigEditor({ form, metrics, implementations, onCancel, onSubmit }) {
  const [draft, setDraft] = useState(form);
  const availableImplementations = useMemo(() => implementations.filter((item) => item.metricDefinitionId === draft.metricDefinitionId), [implementations, draft.metricDefinitionId]);
  return (
    <div className="fp-inline-editor">
      <div className="fp-form fp-form--compact">
        <Field label={t('metric.objectType')} value={draft.objectType} onChange={(objectType) => setDraft({ ...draft, objectType })} />
        <Field label={t('metric.objectId')} value={draft.objectId} onChange={(objectId) => setDraft({ ...draft, objectId })} />
        <Field label={t('metric.objectName')} value={draft.objectName} onChange={(objectName) => setDraft({ ...draft, objectName, objectCode: draft.objectCode || objectName })} />
        <SelectField label={t('metric.name')} value={draft.metricDefinitionId} options={metrics.map((item) => [item.id, `${item.metricName} / ${item.metricCode}`])} onChange={(metricDefinitionId) => setDraft({ ...draft, metricDefinitionId, implementationId: '' })} />
        <SelectField label={t('metric.implementation')} value={draft.implementationId || ''} options={[['', t('metric.useDefaultImplementation')]].concat(availableImplementations.map((item) => [item.id, item.implementationName]))} onChange={(implementationId) => setDraft({ ...draft, implementationId })} />
        <SelectField label={t('metric.executionMode')} value={draft.executionMode || 'SSH'} options={EXECUTION_OPTIONS} onChange={(executionMode) => setDraft({ ...draft, executionMode })} />
        <Field label={t('metric.interval')} type="number" value={draft.intervalSec || 60} onChange={(intervalSec) => setDraft({ ...draft, intervalSec: Number(intervalSec) })} />
        <label className="fp-field fp-field--wide">
          <span>{t('metric.parameterJson')}</span>
          <textarea value={draft.parameterJson || ''} onChange={(event) => setDraft({ ...draft, parameterJson: event.target.value })} placeholder='{"topic":"dw_order","groupId":"order-consumer"}' />
        </label>
      </div>
      <div className="fp-actions">
        <button className="fp-button" type="button" onClick={onCancel}>{t('cancel')}</button>
        <button className="fp-button fp-button--primary" type="button" onClick={() => onSubmit(draft)}>{t('save')}</button>
      </div>
    </div>
  );
}

const EXECUTION_OPTIONS = [['SERVER', 'SERVER'], ['SSH', 'SSH'], ['AGENT', 'AGENT'], ['EXPRESSION', 'EXPRESSION']];

function defaultConfig(objectContext) {
  return {
    objectType: objectContext ? objectContext.objectType : 'KAFKA',
    objectId: objectContext ? objectContext.objectId : '',
    objectCode: objectContext ? objectContext.objectCode : '',
    objectName: objectContext ? objectContext.objectName : '',
    metricDefinitionId: '',
    implementationId: '',
    executionMode: 'SSH',
    intervalSec: 60,
    parameterJson: '',
    enabled: true,
  };
}

function normalizeConfigPayload(form, objectContext) {
  const objectName = form.objectName || (objectContext && objectContext.objectName) || form.objectId;
  return {
    ...form,
    objectType: form.objectType || (objectContext && objectContext.objectType),
    objectId: form.objectId || (objectContext && objectContext.objectId),
    objectCode: form.objectCode || (objectContext && objectContext.objectCode) || objectName,
    objectName,
    intervalSec: Number(form.intervalSec || 60),
    enabled: form.enabled !== false,
  };
}

function Field({ label, value, onChange, type = 'text' }) {
  return (
    <label className="fp-field">
      <span>{label}</span>
      <input type={type} value={value || ''} onChange={(event) => onChange(event.target.value)} autoComplete="off" />
    </label>
  );
}

function SelectField({ label, value, options, onChange }) {
  return (
    <label className="fp-field">
      <span>{label}</span>
      <select value={value || ''} onChange={(event) => onChange(event.target.value)}>
        {options.map(([optionValue, labelText]) => <option key={optionValue} value={optionValue}>{labelText}</option>)}
      </select>
    </label>
  );
}

function labelExecution(value) {
  return value || '-';
}

function labelCollect(value) {
  if (value === 'NORMAL') return t('metric.collectNormal');
  if (value === 'ERROR') return t('metric.collectError');
  return t('metric.collectUnknown');
}
