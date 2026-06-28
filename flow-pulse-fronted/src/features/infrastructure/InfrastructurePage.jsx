import React, { useEffect, useMemo, useState } from 'react';
import ApiOutlined from '@uyun/icons/ApiOutlined';
import CloudSyncOutlined from '@uyun/icons/CloudSyncOutlined';
import DatabaseOutlined from '@uyun/icons/DatabaseOutlined';
import DeleteOutlined from '@uyun/icons/DeleteOutlined';
import EditOutlined from '@uyun/icons/EditOutlined';
import PlusOutlined from '@uyun/icons/PlusOutlined';
import SearchOutlined from '@uyun/icons/SearchOutlined';
import { infrastructureApi } from '../../api/infrastructureApi';
import ConfirmDialog from '../../components/ConfirmDialog';
import Pagination from '../../components/Pagination';
import Toast from '../../components/Toast';
import { t } from '../../i18n';

const EMPTY_PAGE = {
  stats: [],
  infrastructures: { records: [], total: 0, pageNo: 1, pageSize: 10 },
  environments: [],
  regions: [],
};

const DEFAULT_FORM = {
  type: 'KAFKA',
  code: '',
  name: '',
  envId: '',
  regionId: '',
  endpoint: '',
  authType: 'NONE',
  username: '',
  password: '',
  apiKey: '',
  syncScope: '*',
  syncMode: 'RECONCILE',
  syncEnabled: true,
  syncIntervalSec: 300,
  description: '',
};

const TYPE_OPTIONS = [
  ['KAFKA', 'Kafka'],
  ['SPARK', 'Spark'],
  ['ELASTICSEARCH', 'Elasticsearch'],
];

const STATUS_OPTIONS = [
  ['', 'infrastructure.allStatus'],
  ['NORMAL', 'infrastructure.statusNormal'],
  ['ERROR', 'infrastructure.statusError'],
  ['UNKNOWN', 'infrastructure.statusUnknown'],
];

const SYNC_MODE_OPTIONS = [
  ['RECONCILE', 'infrastructure.syncModeReconcile'],
  ['APPEND', 'infrastructure.syncModeAppend'],
  ['REFRESH', 'infrastructure.syncModeRefresh'],
];

export default function InfrastructurePage() {
  const [page, setPage] = useState(EMPTY_PAGE);
  const [query, setQuery] = useState({ pageNo: 1, pageSize: 10 });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [formPage, setFormPage] = useState(null);
  const [confirm, setConfirm] = useState(null);
  const [detailId, setDetailId] = useState('');
  const [testingId, setTestingId] = useState('');
  const [resources, setResources] = useState({ records: [], total: 0, pageNo: 1, pageSize: 10 });
  const [resourceQuery, setResourceQuery] = useState({ pageNo: 1, pageSize: 10 });
  const [syncMode, setSyncMode] = useState('RECONCILE');

  const envIndex = useMemo(() => indexById(page.environments), [page.environments]);
  const regionIndex = useMemo(() => indexById(page.regions), [page.regions]);
  const selectedScopeLabel = useMemo(() => scopeLabel(query, envIndex, regionIndex), [query, envIndex, regionIndex]);
  const detail = page.infrastructures.records.find((item) => item.id === detailId);

  useEffect(() => {
    load(query);
  }, []);

  useEffect(() => {
    if (!message) {
      return undefined;
    }
    const timer = window.setTimeout(() => setMessage(''), 3000);
    return () => window.clearTimeout(timer);
  }, [message]);

  useEffect(() => {
    if (detailId) {
      const current = page.infrastructures.records.find((item) => item.id === detailId);
      setSyncMode((current && current.syncMode) || 'RECONCILE');
      loadResources(detailId, resourceQuery);
    }
  }, [detailId]);

  async function load(nextQuery = query) {
    setLoading(true);
    try {
      const data = await infrastructureApi.page(nextQuery);
      setPage(data || EMPTY_PAGE);
      setQuery(nextQuery);
    } catch (error) {
      setMessage(error.message);
    } finally {
      setLoading(false);
    }
  }

  async function loadResources(id, nextQuery = resourceQuery) {
    try {
      const data = await infrastructureApi.resources(id, nextQuery);
      setResources(data || { records: [], total: 0, pageNo: 1, pageSize: 10 });
      setResourceQuery(nextQuery);
    } catch (error) {
      setMessage(error.message);
    }
  }

  async function submit(form) {
    try {
      let saved;
      if (form.id) {
        saved = await infrastructureApi.update(form.id, form);
      } else {
        saved = await infrastructureApi.create(form);
      }
      setFormPage(null);
      setMessage(t('infrastructure.saved'));
      await load(query);
      if (form.id || (saved && saved.id)) {
        setDetailId(form.id || saved.id);
      }
    } catch (error) {
      setMessage(error.message);
    }
  }

  async function toggleRun(item) {
    try {
      if (item.runStatus !== 'ENABLED' && item.connectionStatus !== 'NORMAL') {
        setMessage(t('infrastructure.enableNeedTest'));
        return;
      }
      await infrastructureApi.updateRunStatus(item.id, item.runStatus !== 'ENABLED');
      await load(query);
    } catch (error) {
      setMessage(error.message);
    }
  }

  async function test(item) {
    if (testingId) {
      return;
    }
    setTestingId(item.id);
    try {
      const result = await infrastructureApi.test(item.id);
      setMessage(actionMessage('test', item, result));
      await load(query);
    } catch (error) {
      setMessage(actionMessage('test', item, { status: 'ERROR', message: error.message }));
    } finally {
      setTestingId('');
    }
  }

  async function sync(item) {
    try {
      const result = await infrastructureApi.sync(item.id, syncMode);
      setMessage(actionMessage('sync', item, result));
      await load(query);
      if (detailId === item.id) {
        await loadResources(item.id, resourceQuery);
      }
    } catch (error) {
      setMessage(actionMessage('sync', item, { status: 'ERROR', message: error.message }));
    }
  }

  async function changeSyncMode(item, nextSyncMode) {
    setSyncMode(nextSyncMode);
    try {
      await infrastructureApi.update(item.id, normalizeFormByAuth({ ...item, syncMode: nextSyncMode }));
      await load(query);
    } catch (error) {
      setMessage(error.message);
    }
  }

  async function copyText(value) {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        try {
          await navigator.clipboard.writeText(value || '');
          return true;
        } catch (error) {
          // Fall back to the legacy path below when the browser blocks Clipboard API.
        }
      }
      const input = document.createElement('textarea');
      input.value = value || '';
      input.setAttribute('readonly', 'readonly');
      input.style.position = 'fixed';
      input.style.left = '-9999px';
      document.body.appendChild(input);
      input.select();
      const copied = document.execCommand('copy');
      document.body.removeChild(input);
      return copied || Boolean(value);
    } catch (error) {
      return false;
    }
  }

  function selectScope(envId, regionId = '') {
    load({ ...query, envId, regionId, pageNo: 1 });
  }

  function openForm(item) {
    const defaultEnvId = page.environments[0] && page.environments[0].id;
    const defaultRegions = page.regions.filter((region) => !defaultEnvId || region.envId === defaultEnvId);
    setFormPage({
      title: item ? `${t('infrastructure.edit')}：${item.name || item.code}` : t('infrastructure.add'),
      form: item
        ? normalizeFormByAuth({ ...DEFAULT_FORM, ...item })
        : { ...DEFAULT_FORM, envId: defaultEnvId, regionId: defaultRegions[0] && defaultRegions[0].id },
    });
  }

  function requestDelete(item) {
    setConfirm({
      title: t('confirmDelete'),
      content: t('deleteConfirmContent', item.name),
      onConfirm: async () => {
        try {
          await infrastructureApi.delete(item.id);
          setConfirm(null);
          setDetailId('');
          setMessage(t('deleteSuccess'));
          await load(query);
        } catch (error) {
          setConfirm(null);
          setMessage(error.message);
        }
      },
    });
  }

  if (formPage) {
    return (
      <InfrastructureFormPage
        dialog={formPage}
        setDialog={setFormPage}
        onSubmit={submit}
        page={page}
        onBack={() => setFormPage(null)}
        message={message}
        onClearMessage={() => setMessage('')}
      />
    );
  }

  if (detail) {
    return (
      <section className="fp-page">
        <button className="fp-link-button fp-back-link" type="button" onClick={() => setDetailId('')}>
          {t('infrastructure.back')}
        </button>
        <div className="fp-detail-hero">
          <div>
            <span className="fp-kicker">{detail.type}</span>
            <h1>{detail.name}</h1>
            <p>{detail.description || t('infrastructure.noDescription')}</p>
          </div>
          <div className="fp-actions fp-actions--wrap">
            <StatusPill status={detail.connectionStatus} />
            <button className="fp-button" type="button" onClick={() => openForm(detail)}><EditOutlined />{t('edit')}</button>
            <button className={`fp-button ${testingId === detail.id ? 'is-loading' : ''}`} type="button" disabled={testingId === detail.id} onClick={() => test(detail)}>
              <ApiOutlined />{testingId === detail.id ? t('infrastructure.testing') : t('infrastructure.test')}
            </button>
            <button className="fp-button fp-button--ghost-danger" type="button" onClick={() => requestDelete(detail)}><DeleteOutlined />{t('delete')}</button>
          </div>
        </div>

        <Toast message={message} onClose={() => setMessage('')} />

        <div className="fp-detail-sections">
          <DetailSection title={t('infrastructure.basicInfo')}>
            <Info label={t('infrastructure.code')} value={detail.code} />
            <Info label={t('infrastructure.type')} value={detail.type} />
            <Info label={t('regionEnv')} value={envIndex[detail.envId]?.envName || '-'} />
            <Info label={t('infrastructure.region')} value={regionIndex[detail.regionId]?.regionName || '-'} />
            <Info label={t('description')} value={detail.description || t('infrastructure.noDescription')} />
          </DetailSection>
          <DetailSection title={t('infrastructure.connectionInfo')}>
            <Info label={connectionEndpointLabel(detail.type)} value={detail.endpoint} action={<CopyButton value={detail.endpoint} onCopy={copyText} />} />
            <Info label={t('infrastructure.authType')} value={detail.authType || 'NONE'} />
            <Info label={t('infrastructure.username')} value={detail.username || '-'} />
            <Info label={t('infrastructure.password')} value={detail.password ? '******' : '-'} />
            <Info label={t('infrastructure.lastTest')} value={formatTime(detail.lastTestAt)} />
            <Info label={t('infrastructure.lastTestMessage')} value={normalizeActionMessage(detail.lastTestMessage) || '-'} />
          </DetailSection>
          <DetailSection title={t('infrastructure.syncConfig')}>
            <Info label={t('infrastructure.syncScope')} value={detail.syncScope || '*'} />
            <Info label={t('infrastructure.syncInterval')} value={`${detail.syncIntervalSec || 0}s`} />
            <Info label={t('infrastructure.syncEnabled')} value={detail.syncEnabled ? t('yes') : t('no')} />
            <Info label={t('infrastructure.lastSync')} value={formatTime(detail.lastSyncAt)} />
            <Info label={t('infrastructure.lastSyncMessage')} value={normalizeActionMessage(detail.lastSyncMessage) || '-'} />
          </DetailSection>
        </div>

        <section className="fp-card fp-resource-card">
          <div className="fp-section-title">
          <h2>{t('infrastructure.resources')}</h2>
          <div className="fp-resource-toolbar">
            <div className="fp-inline-search">
              <SearchOutlined />
              <input
                value={resourceQuery.keyword || ''}
                placeholder={t('infrastructure.searchResource')}
                onChange={(event) => setResourceQuery({ ...resourceQuery, keyword: event.target.value, pageNo: 1 })}
                onKeyDown={(event) => { if (event.key === 'Enter') loadResources(detail.id, { ...resourceQuery, pageNo: 1 }); }}
              />
            </div>
            <SelectBare value={syncMode} options={SYNC_MODE_OPTIONS} onChange={(value) => changeSyncMode(detail, value)} />
            <button className="fp-button fp-button--primary fp-resource-sync-button" type="button" onClick={() => sync(detail)}><CloudSyncOutlined />{t('infrastructure.sync')}</button>
          </div>
          </div>
          <div className="fp-data-table">
            <div className="fp-data-table__row fp-data-table__row--head">
              <span>{t('infrastructure.resourceName')}</span>
              <span>{t('infrastructure.resourceType')}</span>
              <span>{t('infrastructure.status')}</span>
              <span>{t('infrastructure.lastSync')}</span>
            </div>
            {resources.records.length === 0 ? <div className="fp-empty">{t('empty')}</div> : null}
            {resources.records.map((resource) => (
              <div className="fp-data-table__row" key={resource.id}>
                <strong>{resource.resourceName}</strong>
                <span>{resource.resourceType}</span>
                <span>{resource.status}</span>
                <span>{formatTime(resource.lastSyncAt)}</span>
              </div>
            ))}
          </div>
          <Pagination
            pageNo={resources.pageNo}
            pageSize={resources.pageSize}
            total={resources.total}
            onChange={(next) => loadResources(detail.id, { ...resourceQuery, ...next })}
          />
        </section>
        {confirm ? <ConfirmDialog title={confirm.title} content={confirm.content} onCancel={() => setConfirm(null)} onConfirm={confirm.onConfirm} /> : null}
      </section>
    );
  }

  return (
    <section className="fp-page">
      <div className="fp-page__header">
        <div>
          <h1>{t('menuInfrastructure')}</h1>
          <p>{t('infrastructure.pageDesc')}</p>
        </div>
        <button className="fp-button fp-button--primary" type="button" onClick={() => openForm()}>
          <PlusOutlined />
          {t('infrastructure.add')}
        </button>
      </div>

      <Toast message={message} onClose={() => setMessage('')} />

      <div className="fp-stat-grid">
        {page.stats.map((stat, index) => (
          <div className="fp-stat" key={stat.title}>
            <div className="fp-stat__icon">{index % 2 === 0 ? <DatabaseOutlined /> : <ApiOutlined />}</div>
            <div>
              <span>{t(stat.title)}</span>
              <strong>{stat.value}</strong>
              <em>{t(stat.description)}</em>
            </div>
          </div>
        ))}
      </div>

      <section className="fp-card fp-infra-list">
        <div className="fp-section-title">
          <h2>{t('infrastructure.list')}</h2>
          {loading ? <span className="fp-muted-text">{t('loading')}</span> : null}
        </div>
        <div className="fp-infra-workspace">
          <EnvironmentTree
            environments={page.environments}
            regions={page.regions}
            selectedEnvId={query.envId || ''}
            selectedRegionId={query.regionId || ''}
            onSelect={selectScope}
          />
          <div className="fp-infra-content">
            <div className="fp-infra-content__bar">
              <div>
                <strong>{selectedScopeLabel}</strong>
                <span>{t('infrastructure.instanceCount', page.infrastructures.total)}</span>
              </div>
              <div className="fp-filter-row fp-filter-row--compact">
                <div className="fp-inline-search">
                  <SearchOutlined />
                  <input value={query.keyword || ''} placeholder={t('infrastructure.searchByName')} onChange={(event) => setQuery({ ...query, keyword: event.target.value, pageNo: 1 })} />
                </div>
                <SelectBare value={query.status || ''} options={STATUS_OPTIONS} onChange={(status) => setQuery({ ...query, status, pageNo: 1 })} />
                <button className="fp-button" type="button" onClick={() => load({ ...query, pageNo: 1 })}>{t('filter')}</button>
              </div>
            </div>
            <div className="fp-infra-grid">
              {page.infrastructures.records.length === 0 ? <div className="fp-empty">{t('empty')}</div> : null}
              {page.infrastructures.records.map((item) => (
                <article className="fp-infra-card" key={item.id}>
                  <div className="fp-infra-card__top">
                    <div>
                      <button className="fp-card-title-button" type="button" onClick={() => setDetailId(item.id)}>
                        {item.name}
                      </button>
                      <span className={`fp-type-tag fp-type-tag--${item.type.toLowerCase()}`}>{item.type}</span>
                      <em>{item.code}</em>
                    </div>
                    <button className={`fp-switch ${item.runStatus === 'ENABLED' ? 'is-on' : ''}`} type="button" onClick={() => toggleRun(item)}>
                      <span />
                      {item.runStatus === 'ENABLED' ? t('infrastructure.runEnabled') : t('infrastructure.runDisabled')}
                    </button>
                  </div>
                  <div className="fp-infra-status-line">
                    <StatusPill status={item.connectionStatus} />
                    <button className={`fp-button fp-button--small ${testingId === item.id ? 'is-loading' : ''}`} type="button" disabled={testingId === item.id} onClick={() => test(item)}>
                      {testingId === item.id ? t('infrastructure.testing') : t('infrastructure.test')}
                    </button>
                  </div>
                  <div className="fp-infra-meta">
                    <span>{`${envIndex[item.envId]?.envName || '-'} / ${regionIndex[item.regionId]?.regionName || '-'}`}</span>
                    <span>{t('infrastructure.syncScope')} {item.syncScope || '*'}</span>
                    <span>{t('infrastructure.lastSync')} {formatTime(item.lastSyncAt)}</span>
                  </div>
                  <div className="fp-infra-endpoint">
                    <span>{item.endpoint}</span>
                    <CopyButton value={item.endpoint} onCopy={copyText} />
                  </div>
                  <p>{item.description || t('infrastructure.noDescription')}</p>
                </article>
              ))}
            </div>
            <Pagination
              pageNo={page.infrastructures.pageNo}
              pageSize={page.infrastructures.pageSize}
              total={page.infrastructures.total}
              onChange={(next) => load({ ...query, ...next })}
            />
          </div>
        </div>
      </section>
      {confirm ? <ConfirmDialog title={confirm.title} content={confirm.content} onCancel={() => setConfirm(null)} onConfirm={confirm.onConfirm} /> : null}
    </section>
  );
}

function InfrastructureFormPage({ dialog, setDialog, onSubmit, page, onBack, message, onClearMessage }) {
  const [form, setForm] = useState(dialog.form);
  const regions = page.regions.filter((region) => !form.envId || region.envId === form.envId);
  const authType = form.authType || 'NONE';
  const isEdit = Boolean(form.id);
  return (
    <section className="fp-page">
      <button className="fp-link-button fp-back-link" type="button" onClick={onBack}>
        {t('infrastructure.back')}
      </button>
      <div className="fp-form-header">
        <div>
          <span className="fp-kicker">{form.id ? t('infrastructure.edit') : t('infrastructure.add')}</span>
          <h1>{dialog.title}</h1>
          <p>{isEdit ? t('infrastructure.editImmutableHint') : t('infrastructure.formPageDesc')}</p>
        </div>
        <div className="fp-actions fp-actions--wrap">
          <button className="fp-button" type="button" onClick={() => setDialog(null)}>{t('cancel')}</button>
          <button className="fp-button fp-button--primary" type="button" onClick={() => onSubmit(normalizeFormByAuth(form))}>{t('save')}</button>
        </div>
      </div>
      <section className="fp-card">
        <Toast message={message} onClose={onClearMessage} />
        <div className="fp-form fp-form--page">
        <div className="fp-form-section">
          <strong>{t('infrastructure.basicSection')}</strong>
          <span>{t('infrastructure.basicSectionDesc')}</span>
        </div>
        <FieldSelect label={t('infrastructure.type')} value={form.type} options={TYPE_OPTIONS} onChange={(type) => setForm({ ...form, type })} disabled={isEdit} />
        <Field label={t('infrastructure.code')} value={form.code} onChange={(code) => setForm({ ...form, code })} disabled={isEdit} />
        <Field label={t('infrastructure.name')} value={form.name} onChange={(name) => setForm({ ...form, name })} />
        <FieldSelect label={t('regionEnv')} value={form.envId} options={page.environments.map((env) => [env.id, env.envName])} disabled={isEdit} onChange={(envId) => {
          const nextRegions = page.regions.filter((region) => region.envId === envId);
          setForm({ ...form, envId, regionId: nextRegions[0] && nextRegions[0].id });
        }} />
        <FieldSelect label={t('infrastructure.region')} value={form.regionId} options={regions.map((region) => [region.id, region.regionName])} onChange={(regionId) => setForm({ ...form, regionId })} disabled={isEdit} />
        <Field label={t('infrastructure.endpoint')} value={form.endpoint} onChange={(endpoint) => setForm({ ...form, endpoint })} hint={endpointHint(form.type)} />
        <FieldSelect label={t('infrastructure.authType')} value={authType} options={[['NONE', 'NONE'], ['BASIC', 'BASIC'], ['API_KEY', 'API_KEY']]} onChange={(nextAuthType) => setForm(normalizeFormByAuth({ ...form, authType: nextAuthType }))} />
        <Field label={t('infrastructure.username')} value={authType === 'BASIC' ? form.username : ''} onChange={(username) => setForm({ ...form, username })} disabled={authType !== 'BASIC'} />
        <Field label={t('infrastructure.password')} value={authType === 'BASIC' ? form.password : ''} onChange={(password) => setForm({ ...form, password })} type="password" disabled={authType !== 'BASIC'} autoComplete="new-password" />
        <Field label={t('infrastructure.apiKey')} value={authType === 'API_KEY' ? form.apiKey : ''} onChange={(apiKey) => setForm({ ...form, apiKey })} disabled={authType !== 'API_KEY'} />
        <div className="fp-form-section">
          <strong>{t('infrastructure.syncSection')}</strong>
          <span>{t('infrastructure.syncSectionDesc')}</span>
        </div>
        <Field label={t('infrastructure.syncScope')} value={form.syncScope} onChange={(syncScope) => setForm({ ...form, syncScope })} hint={t('infrastructure.syncScopeHint')} />
        <FieldSelect label={t('infrastructure.syncMode')} value={form.syncMode || 'RECONCILE'} options={SYNC_MODE_OPTIONS} onChange={(syncMode) => setForm({ ...form, syncMode })} />
        <Field label={t('infrastructure.syncInterval')} value={form.syncIntervalSec} onChange={(syncIntervalSec) => setForm({ ...form, syncIntervalSec: Number(syncIntervalSec) })} type="number" />
        <Field label={t('description')} value={form.description} onChange={(description) => setForm({ ...form, description })} />
        </div>
      </section>
    </section>
  );
}

function StatusPill({ status }) {
  const key = status === 'NORMAL' ? 'infrastructure.statusNormal' : (status === 'ERROR' ? 'infrastructure.statusError' : 'infrastructure.statusUnknown');
  return <span className={`fp-status-pill fp-status-pill--${(status || 'UNKNOWN').toLowerCase()}`}>{t(key)}</span>;
}

function DetailSection({ title, children }) {
  return (
    <section className="fp-detail-section">
      <h2>{title}</h2>
      <div className="fp-info-grid">{children}</div>
    </section>
  );
}

function Info({ label, value, action = null }) {
  return (
    <div className="fp-info-box">
      <span>{label}</span>
      <strong>
        <span>{value || '-'}</span>
        {action}
      </strong>
    </div>
  );
}

function CopyButton({ value, onCopy }) {
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    if (!copied) {
      return undefined;
    }
    const timer = window.setTimeout(() => setCopied(false), 1600);
    return () => window.clearTimeout(timer);
  }, [copied]);
  return (
    <button className="fp-copy-button" type="button" onClick={(event) => {
      event.stopPropagation();
      Promise.resolve(onCopy(value)).then((success) => setCopied(Boolean(success)));
    }}>
      {copied ? t('copied') : t('copy')}
    </button>
  );
}

function EnvironmentTree({ environments, regions, selectedEnvId, selectedRegionId, onSelect }) {
  return (
    <aside className="fp-infra-tree">
      <div className="fp-infra-tree__title">{t('infrastructure.scopeTree')}</div>
      <button className={!selectedEnvId && !selectedRegionId ? 'is-active' : ''} type="button" onClick={() => onSelect('', '')}>
        {t('infrastructure.allScope')}
      </button>
      {environments.map((env) => {
        const managers = regions.filter((region) => region.envId === env.id && region.regionType === 'MANAGEMENT');
        return (
          <div className="fp-tree-group" key={env.id}>
            <button className={selectedEnvId === env.id && !selectedRegionId ? 'is-active' : ''} type="button" onClick={() => onSelect(env.id, '')}>
              <span>{env.envName}</span>
              <em>{env.envCode}</em>
            </button>
            {managers.map((manager) => {
              const computes = regions.filter((region) => region.parentRegionId === manager.id);
              return (
                <div className="fp-tree-children" key={manager.id}>
                  <button className={`fp-tree-management ${selectedRegionId === manager.id ? 'is-active' : ''}`} type="button" onClick={() => onSelect(env.id, manager.id)}>
                    <span>{manager.regionName}</span>
                    <em>{t('managementRegion')}</em>
                  </button>
                  <div className="fp-tree-computes">
                    {computes.map((compute) => (
                      <button className={`fp-tree-compute ${selectedRegionId === compute.id ? 'is-active' : ''}`} key={compute.id} type="button" onClick={() => onSelect(env.id, compute.id)}>
                        <span>{compute.regionName}</span>
                        <em>{t('computeRegion')}</em>
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        );
      })}
    </aside>
  );
}

function Field({ label, value, onChange, type = 'text', hint = '', disabled = false, autoComplete = 'off' }) {
  return (
    <label className="fp-field">
      <span>{label}</span>
      <input
        type={type}
        value={value || ''}
        onChange={(event) => onChange(event.target.value)}
        autoComplete={autoComplete}
        disabled={disabled}
        name={`fp-${label}-${type}`}
        readOnly={disabled}
      />
      {hint ? <em>{hint}</em> : null}
    </label>
  );
}

function FieldSelect({ label, value, options, onChange, disabled = false }) {
  return (
    <div className="fp-field">
      <span>{label}</span>
      <CustomSelect value={value || ''} options={[['', 'selectPlaceholder']].concat(options)} onChange={onChange} disabled={disabled} />
    </div>
  );
}

function SelectBare({ value, options, onChange }) {
  return <CustomSelect className="fp-select-bare" value={value || ''} options={options} onChange={onChange} />;
}

function CustomSelect({ value, options, onChange, className = '', disabled = false }) {
  const [open, setOpen] = useState(false);
  const current = options.find(([optionValue]) => optionValue === value) || options[0];
  return (
    <div className={`fp-select-custom ${className} ${disabled ? 'is-disabled' : ''}`} tabIndex={disabled ? -1 : 0} onBlur={() => setOpen(false)}>
      <button className="fp-select-custom__trigger" type="button" disabled={disabled} onClick={() => !disabled && setOpen(!open)}>
        <span>{renderOptionLabel(current && current[1])}</span>
        <i />
      </button>
      {open ? (
        <div className="fp-select-custom__menu">
          {options.map(([optionValue, label]) => (
            <button
              className={optionValue === value ? 'is-active' : ''}
              key={optionValue}
              type="button"
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => {
                onChange(optionValue);
                setOpen(false);
              }}
            >
              {renderOptionLabel(label)}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function indexById(records) {
  const index = {};
  records.forEach((record) => {
    index[record.id] = record;
  });
  return index;
}

function formatTime(value) {
  if (!value) {
    return '-';
  }
  return new Date(value).toLocaleString();
}

function endpointHint(type) {
  if (type === 'KAFKA') {
    return t('infrastructure.kafkaEndpointHint');
  }
  if (type === 'SPARK') {
    return t('infrastructure.sparkEndpointHint');
  }
  if (type === 'ELASTICSEARCH') {
    return t('infrastructure.esEndpointHint');
  }
  return '';
}

function connectionEndpointLabel(type) {
  if (type === 'KAFKA') {
    return t('infrastructure.kafkaBootstrapServers');
  }
  if (type === 'SPARK') {
    return t('infrastructure.sparkMasterWebUi');
  }
  if (type === 'ELASTICSEARCH') {
    return t('infrastructure.esHttpEndpoint');
  }
  return t('infrastructure.endpoint');
}

function scopeLabel(query, envIndex, regionIndex) {
  if (query.regionId) {
    const region = regionIndex[query.regionId];
    const env = region ? envIndex[region.envId] : null;
    return `${env ? env.envName : '-'} / ${region ? region.regionName : '-'}`;
  }
  if (query.envId) {
    const env = envIndex[query.envId];
    return env ? env.envName : t('infrastructure.allScope');
  }
  return t('infrastructure.allScope');
}

function renderOptionLabel(label) {
  return label && label.indexOf('.') > 0 ? t(label) : t(label);
}

function normalizeActionMessage(message) {
  if (message && message.indexOf('KAFKA_ZOOKEEPER_ENDPOINT') >= 0) {
    return t('infrastructure.kafkaZookeeperEndpoint');
  }
  return message || '';
}

function actionMessage(action, item, result) {
  const success = result && (result.status === 'NORMAL' || result.status === 'SUCCESS');
  const reason = normalizeActionMessage(result && result.message);
  if (action === 'test') {
    return success
      ? t('infrastructure.testPassed', item.name)
      : t('infrastructure.testFailed', item.name, conciseReason(reason));
  }
  return success
    ? t('infrastructure.syncSucceeded', item.name, parseSyncCount(reason))
    : t('infrastructure.syncFailed', item.name, conciseReason(reason));
}

function parseSyncCount(message) {
  const match = String(message || '').match(/count=(\d+)/);
  return match ? match[1] : '-';
}

function conciseReason(message) {
  const text = String(message || '').trim();
  if (!text) {
    return t('infrastructure.unknownReason');
  }
  if (text.length <= 120) {
    return text;
  }
  return `${text.substring(0, 120)}...`;
}

function normalizeFormByAuth(form) {
  const authType = form.authType || 'NONE';
  if (authType === 'NONE') {
    return { ...form, authType, username: '', password: '', apiKey: '' };
  }
  if (authType === 'BASIC') {
    return { ...form, authType, apiKey: '' };
  }
  if (authType === 'API_KEY') {
    return { ...form, authType, username: '', password: '' };
  }
  return form;
}
