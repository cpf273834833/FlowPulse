import React, { useEffect, useMemo, useState } from 'react';
import ApiOutlined from '@uyun/icons/ApiOutlined';
import CloudSyncOutlined from '@uyun/icons/CloudSyncOutlined';
import DeleteOutlined from '@uyun/icons/DeleteOutlined';
import EditOutlined from '@uyun/icons/EditOutlined';
import PlusOutlined from '@uyun/icons/PlusOutlined';
import SearchOutlined from '@uyun/icons/SearchOutlined';
import { executorNodeApi } from '../../api/executorNodeApi';
import ConfirmDialog from '../../components/ConfirmDialog';
import EnvironmentScopeTree from '../../components/EnvironmentScopeTree';
import Pagination from '../../components/Pagination';
import { StatIcon } from '../../components/PageChrome';
import Toast from '../../components/Toast';
import { t } from '../../i18n';

const EMPTY_PAGE = {
  nodes: { records: [], total: 0, pageNo: 1, pageSize: 20 },
  environments: [],
  regions: [],
  stats: [],
};

const DEFAULT_FORM = {
  envId: '',
  regionId: '',
  host: '',
  sshPort: 22,
  sshUsername: '',
  sshPassword: '',
  sshAuthType: 'PASSWORD',
  sshPrivateKey: '',
  javaHome: '',
  pythonPath: '',
};

const STATUS_OPTIONS = [
  ['', 'executor.allStatus'],
  ['NORMAL', 'executor.connectionNormal'],
  ['ERROR', 'executor.connectionError'],
  ['UNKNOWN', 'executor.connectionUnknown'],
];

const SOURCE_OPTIONS = [
  ['', 'executor.allSource'],
  ['MANUAL', 'executor.sourceManual'],
  ['OMP', 'executor.sourceOmp'],
];

export default function ExecutorNodePage() {
  const [page, setPage] = useState(EMPTY_PAGE);
  const [query, setQuery] = useState({ pageNo: 1, pageSize: 20 });
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [detailId, setDetailId] = useState('');
  const [detail, setDetail] = useState(null);
  const [formPage, setFormPage] = useState(null);
  const [confirm, setConfirm] = useState(null);
  const [testing, setTesting] = useState(false);
  const [syncing, setSyncing] = useState(false);

  const envIndex = useMemo(() => indexById(page.environments), [page.environments]);
  const regionIndex = useMemo(() => indexById(page.regions), [page.regions]);
  const selectedScopeLabel = useMemo(() => scopeLabel(query, envIndex, regionIndex), [query, envIndex, regionIndex]);

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

  async function load(nextQuery = query) {
    setLoading(true);
    try {
      const data = await executorNodeApi.page(nextQuery);
      setPage(data || EMPTY_PAGE);
      setQuery(nextQuery);
    } catch (error) {
      setMessage(error.message);
    } finally {
      setLoading(false);
    }
  }

  async function openDetail(id) {
    try {
      const data = await executorNodeApi.detail(id);
      setDetail(data);
      setDetailId(id);
    } catch (error) {
      setMessage(error.message);
    }
  }

  async function submit(form) {
    try {
      const payload = normalizeForm(form);
      const saved = form.id ? await executorNodeApi.update(form.id, payload) : await executorNodeApi.create(payload);
      setFormPage(null);
      setMessage(t('executor.saved'));
      await load(query);
      await openDetail(saved.id);
    } catch (error) {
      setMessage(error.message);
    }
  }

  async function testConnection() {
    if (!detail || testing) {
      return;
    }
    setTesting(true);
    try {
      const result = await executorNodeApi.test(detail.id);
      setMessage(result.message || t('executor.testPassed'));
      await load(query);
      await openDetail(detail.id);
    } catch (error) {
      setMessage(error.message);
    } finally {
      setTesting(false);
    }
  }

  async function syncFromOmp() {
    if (!query.regionId) {
      setMessage(t('executor.syncNeedRegion'));
      return;
    }
    setSyncing(true);
    try {
      const result = await executorNodeApi.syncFromOmp(query.regionId);
      setMessage(result.message || t('executor.syncSucceeded'));
      await load(query);
    } catch (error) {
      setMessage(error.message);
    } finally {
      setSyncing(false);
    }
  }

  function selectScope(envId, regionId = '') {
    load({ ...query, envId, regionId, pageNo: 1 });
  }

  function openForm(item) {
    const defaultEnvId = page.environments[0] && page.environments[0].id;
    const defaultRegions = page.regions.filter((region) => !defaultEnvId || region.envId === defaultEnvId);
    setFormPage({
      title: item ? t('executor.edit') : t('executor.add'),
      form: item
        ? { ...DEFAULT_FORM, ...item, sshPassword: '', sshPrivateKey: '' }
        : { ...DEFAULT_FORM, envId: defaultEnvId || '', regionId: (defaultRegions[0] && defaultRegions[0].id) || '' },
    });
  }

  function requestDelete(item) {
    setConfirm({
      title: t('confirmDelete'),
      content: t('deleteConfirmContent', item.host),
      onConfirm: async () => {
        try {
          await executorNodeApi.delete(item.id);
          setConfirm(null);
          setDetail(null);
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
      <ExecutorNodeFormPage
        dialog={formPage}
        environments={page.environments}
        regions={page.regions}
        onBack={() => setFormPage(null)}
        onSubmit={submit}
        message={message}
        onClearMessage={() => setMessage('')}
      />
    );
  }

  if (detailId && detail) {
    return (
      <section className="fp-page">
        <button className="fp-link-button fp-back-link" type="button" onClick={() => { setDetailId(''); setDetail(null); }}>
          {t('executor.back')}
        </button>
        <div className="fp-detail-hero">
          <div>
            <span className="fp-kicker">{sourceLabel(detail.sourceType)}</span>
            <h1>{detail.host}</h1>
            <p>{detail.envName || '-'} / {detail.parentRegionName ? `${detail.parentRegionName} / ` : ''}{detail.regionName || '-'}</p>
          </div>
          <div className="fp-actions fp-actions--wrap">
            <CapabilityPill active={detail.sshSupported} label={t('executor.sshCapability')} />
            <CapabilityPill active={detail.agentSupported} label={t('executor.agentCapability')} />
            <button className={`fp-button ${testing ? 'is-loading' : ''}`} type="button" disabled={testing} onClick={testConnection}>
              <ApiOutlined />{testing ? t('executor.testing') : t('executor.test')}
            </button>
            <button className="fp-button" type="button" onClick={() => openForm(detail)}><EditOutlined />{t('edit')}</button>
            <button className="fp-button fp-button--ghost-danger" type="button" onClick={() => requestDelete(detail)}><DeleteOutlined />{t('delete')}</button>
          </div>
        </div>
        <Toast message={message} onClose={() => setMessage('')} />
        <div className="fp-detail-sections">
          <DetailSection title={t('executor.basicInfo')}>
            <Info label={t('executor.host')} value={detail.host} />
            <Info label={t('regionEnv')} value={detail.envName} />
            <Info label={t('infrastructure.region')} value={detail.regionName} />
            <Info label={t('parentRegion')} value={detail.parentRegionName || '-'} />
            <Info label={t('executor.source')} value={sourceLabel(detail.sourceType)} />
            <Info label={t('executor.createdAt')} value={formatTime(detail.createdAt)} />
          </DetailSection>
          <DetailSection title={t('executor.capabilityInfo')}>
            <Info label={t('executor.sshCapability')} value={detail.sshSupported ? t('executor.supported') : t('executor.unsupported')} />
            <Info label={t('executor.agentCapability')} value={detail.agentSupported ? t('executor.supported') : t('executor.unsupported')} />
            <Info label={t('executor.agentStatus')} value={agentStatusLabel(detail.agentStatus)} />
            <Info label={t('executor.connectionStatus')} value={connectionLabel(detail.connectionStatus)} />
            <Info label={t('executor.lastTestAt')} value={formatTime(detail.lastTestAt)} />
            <Info label={t('executor.lastTestMessage')} value={detail.lastTestMessage || '-'} />
          </DetailSection>
          <DetailSection title={t('executor.sshConfig')}>
            <Info label={t('executor.sshPort')} value={String(detail.sshPort || '-')} />
            <Info label={t('executor.sshUsername')} value={detail.sshUsername || '-'} />
            <Info label={t('executor.sshAuthType')} value={detail.sshAuthType || '-'} />
            <Info label={t('executor.javaHome')} value={detail.javaHome || '-'} />
            <Info label={t('executor.pythonPath')} value={detail.pythonPath || '-'} />
            <Info label={t('executor.credential')} value={detail.credentialConfigured ? (detail.sshAuthType === 'PRIVATE_KEY' ? t('executor.privateKeySaved') : t('executor.passwordSaved')) : '未配置'} />
          </DetailSection>
        </div>
        {confirm ? <ConfirmDialog title={confirm.title} content={confirm.content} onCancel={() => setConfirm(null)} onConfirm={confirm.onConfirm} /> : null}
      </section>
    );
  }

  return (
    <section className="fp-page fp-executor-page">
      <div className="fp-page__header">
        <div>
          <h1>{t('menuExecutorNode')}</h1>
          <p>{t('executor.pageDesc')}</p>
        </div>
        <button className="fp-button fp-button--primary" type="button" onClick={() => openForm()}>
          <PlusOutlined />{t('executor.add')}
        </button>
      </div>
      <Toast message={message} onClose={() => setMessage('')} />
      <div className="fp-stat-grid fp-stat-grid--four">
        {page.stats.map((stat) => (
          <div className="fp-stat" key={stat.title}>
            <StatIcon stat={stat} />
            <div>
              <span>{stat.title}</span>
              <strong>{stat.value}</strong>
              <em>{stat.description}</em>
            </div>
          </div>
        ))}
      </div>
      <section className="fp-card">
        <div className="fp-section-title">
          <h2>{t('executor.list')}</h2>
          {loading ? <span className="fp-muted-text">{t('loading')}</span> : null}
        </div>
        <div className="fp-infra-workspace">
          <EnvironmentScopeTree
            environments={page.environments}
            regions={page.regions}
            selectedEnvId={query.envId || ''}
            selectedRegionId={query.regionId || ''}
            onSelect={selectScope}
            title={t('infrastructure.scopeTree')}
            allLabel={t('infrastructure.allScope')}
            managementLabel={t('managementRegion')}
            computeLabel={t('computeRegion')}
          />
          <div className="fp-infra-content">
            <div className="fp-infra-content__bar">
              <div>
                <strong>{selectedScopeLabel}</strong>
                <span>{t('executor.total', page.nodes.total)}</span>
              </div>
              <div className="fp-filter-row fp-filter-row--node-compact">
                <div className="fp-inline-search">
                  <SearchOutlined />
                  <input value={query.keyword || ''} placeholder={t('executor.search')} onChange={(event) => setQuery({ ...query, keyword: event.target.value, pageNo: 1 })} />
                </div>
                <SelectBare value={query.sourceType || ''} options={SOURCE_OPTIONS} onChange={(sourceType) => setQuery({ ...query, sourceType, pageNo: 1 })} />
                <SelectBare value={query.connectionStatus || ''} options={STATUS_OPTIONS} onChange={(connectionStatus) => setQuery({ ...query, connectionStatus, pageNo: 1 })} />
                <button className="fp-button" type="button" onClick={() => load({ ...query, pageNo: 1 })}>{t('filter')}</button>
                {query.regionId ? (
                  <button className={`fp-button ${syncing ? 'is-loading' : ''}`} type="button" disabled={syncing} onClick={syncFromOmp}>
                    <CloudSyncOutlined />{syncing ? t('executor.syncing') : t('executor.syncFromOmp')}
                  </button>
                ) : null}
              </div>
            </div>
            <div className="fp-logical-card-grid">
              {page.nodes.records.length === 0 ? <div className="fp-empty">{t('empty')}</div> : null}
              {page.nodes.records.map((node) => (
                <article className="fp-management-card" key={node.id}>
                  <div className="fp-management-card__header"><button className="fp-node-link" type="button" onClick={() => openDetail(node.id)}>{node.host}</button><StatusText status={node.connectionStatus} /></div>
                  <p>{envIndex[node.envId]?.envName || '-'} / {regionPath(node, regionIndex)}</p>
                  <div className="fp-actions"><CapabilityPill active={node.sshSupported} compact /><CapabilityPill active={node.agentSupported} compact /></div>
                  <div className="fp-threshold-kv"><div><span>{t('executor.source')}</span><strong>{sourceLabel(node.sourceType)}</strong></div><div><span>{t('executor.lastTestAt')}</span><strong>{formatTime(node.lastTestAt)}</strong></div></div>
                  <div className="fp-actions">
                    <button className="fp-link-button" type="button" onClick={() => openForm(node)}>{t('edit')}</button>
                    <button className="fp-link-button fp-link-button--danger" type="button" onClick={() => requestDelete(node)}>{t('delete')}</button>
                  </div>
                </article>
              ))}
            </div>
            <Pagination
              pageNo={page.nodes.pageNo}
              pageSize={page.nodes.pageSize}
              total={page.nodes.total}
              onChange={(next) => load({ ...query, ...next })}
            />
          </div>
        </div>
      </section>
      {confirm ? <ConfirmDialog title={confirm.title} content={confirm.content} onCancel={() => setConfirm(null)} onConfirm={confirm.onConfirm} /> : null}
    </section>
  );
}

function ExecutorNodeFormPage({ dialog, environments, regions, onBack, onSubmit, message, onClearMessage }) {
  const [form, setForm] = useState(dialog.form);
  const currentRegions = regions.filter((region) => !form.envId || region.envId === form.envId);
  const isEdit = Boolean(form.id);
  const authType = form.sshAuthType || 'PASSWORD';
  return (
    <section className="fp-page">
      <button className="fp-link-button fp-back-link" type="button" onClick={onBack}>{t('executor.back')}</button>
      <div className="fp-detail-hero">
        <div>
          <span className="fp-kicker">{isEdit ? t('executor.edit') : t('executor.add')}</span>
          <h1>{dialog.title}</h1>
          <p>{t('executor.formDesc')}</p>
        </div>
        <div className="fp-actions">
          <button className="fp-button" type="button" onClick={onBack}>{t('cancel')}</button>
          <button className="fp-button fp-button--primary" type="button" onClick={() => onSubmit(form)}>{t('save')}</button>
        </div>
      </div>
      <Toast message={message} onClose={onClearMessage} />
      <section className="fp-card">
        <div className="fp-form fp-form--page">
          <div className="fp-form-section">
            <strong>{t('executor.basicInfo')}</strong>
            <span>{t('executor.basicFormDesc')}</span>
          </div>
          <FieldSelect label={t('regionEnv')} value={form.envId} options={environments.map((env) => [env.id, env.envName])} onChange={(envId) => {
            const nextRegions = regions.filter((region) => region.envId === envId);
            setForm({ ...form, envId, regionId: nextRegions[0] ? nextRegions[0].id : '' });
          }} />
          <FieldSelect label={t('infrastructure.region')} value={form.regionId} options={currentRegions.map((region) => [region.id, region.regionType === 'COMPUTE' && region.parentRegionName ? `${region.parentRegionName} / ${region.regionName}` : region.regionName])} onChange={(regionId) => setForm({ ...form, regionId })} />
          <Field label={t('executor.host')} value={form.host} onChange={(host) => setForm({ ...form, host })} disabled={isEdit} hint={isEdit ? t('executor.hostReadonly') : ''} />
          <div className="fp-form-section">
            <strong>{t('executor.sshConfig')}</strong>
            <span>{t('executor.sshFormDesc')}</span>
          </div>
          <Field label={t('executor.sshPort')} value={form.sshPort} type="number" onChange={(sshPort) => setForm({ ...form, sshPort: Number(sshPort) })} />
          <Field label={t('executor.sshUsername')} value={form.sshUsername} onChange={(sshUsername) => setForm({ ...form, sshUsername })} />
          <FieldSelect label={t('executor.sshAuthType')} value={authType} options={[['PASSWORD', 'executor.authPassword'], ['PRIVATE_KEY', 'executor.authPrivateKey']]} onChange={(sshAuthType) => setForm({ ...form, sshAuthType })} />
          {authType === 'PRIVATE_KEY' ? (
            <label className="fp-field fp-field--wide">
              <span>{t('executor.privateKey')}</span>
              <textarea value={form.sshPrivateKey || ''} autoComplete="off" onChange={(event) => setForm({ ...form, sshPrivateKey: event.target.value })} placeholder={isEdit ? t('executor.credentialKeepHint') : ''} />
            </label>
          ) : (
            <Field label={t('executor.password')} value={form.sshPassword} type="password" autoComplete="new-password" onChange={(sshPassword) => setForm({ ...form, sshPassword })} hint={isEdit ? t('executor.credentialKeepHint') : ''} />
          )}
          <div className="fp-form-section">
            <strong>{t('executor.runtimeConfig')}</strong>
            <span>{t('executor.runtimeFormDesc')}</span>
          </div>
          <Field label={t('executor.javaHome')} value={form.javaHome} onChange={(javaHome) => setForm({ ...form, javaHome })} hint={t('executor.javaHomeHint')} />
          <Field label={t('executor.pythonPath')} value={form.pythonPath} onChange={(pythonPath) => setForm({ ...form, pythonPath })} hint={t('executor.pythonPathHint')} />
        </div>
      </section>
    </section>
  );
}

function DetailSection({ title, children }) {
  return (
    <section className="fp-detail-section">
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

function Field({ label, value, onChange, type = 'text', disabled = false, hint = '', autoComplete = 'off' }) {
  return (
    <label className="fp-field">
      <span>{label}</span>
      <input type={type} value={value || ''} onChange={(event) => onChange(event.target.value)} disabled={disabled} readOnly={disabled} autoComplete={autoComplete} name={`fp-executor-${label}-${type}`} />
      {hint ? <em>{hint}</em> : null}
    </label>
  );
}

function FieldSelect({ label, value, options, onChange }) {
  return (
    <div className="fp-field">
      <span>{label}</span>
      <CustomSelect value={value || ''} options={[['', 'selectPlaceholder']].concat(options)} onChange={onChange} />
    </div>
  );
}

function SelectBare({ value, options, onChange }) {
  return <CustomSelect className="fp-select-bare" value={value || ''} options={options} onChange={onChange} />;
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

function CustomSelect({ value, options, onChange, className = '' }) {
  const [open, setOpen] = useState(false);
  const current = options.find(([optionValue]) => optionValue === value) || options[0];
  return (
    <div className={`fp-select-custom ${className}`} tabIndex={0} onBlur={() => setOpen(false)}>
      <button className="fp-select-custom__trigger" type="button" onClick={() => setOpen(!open)}>
        <span>{optionLabel(current && current[1])}</span>
        <i />
      </button>
      {open ? (
        <div className="fp-select-custom__menu">
          {options.map(([optionValue, label]) => (
            <button className={optionValue === value ? 'is-active' : ''} key={optionValue} type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => { onChange(optionValue); setOpen(false); }}>
              {optionLabel(label)}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function CapabilityPill({ active, label, compact = false }) {
  return <span className={`fp-capability ${active ? 'is-active' : ''}`}>{compact ? '' : label}{active ? t('executor.supported') : t('executor.unsupported')}</span>;
}

function StatusText({ status }) {
  return <span className={`fp-status-text fp-status-text--${(status || 'UNKNOWN').toLowerCase()}`}>{connectionLabel(status)}</span>;
}

function indexById(records) {
  const index = {};
  records.forEach((record) => {
    index[record.id] = record;
  });
  return index;
}

function regionPath(node, regionIndex) {
  const region = regionIndex[node.regionId] || {};
  if (region.parentRegionName) {
    return `${region.parentRegionName} / ${region.regionName || '-'}`;
  }
  return region.regionName || node.regionName || '-';
}

function scopeLabel(query, envIndex, regionIndex) {
  if (query.regionId) {
    const region = regionIndex[query.regionId];
    const env = region ? envIndex[region.envId] : null;
    if (region && region.parentRegionName) {
      return `${env ? env.envName : '-'} / ${region.parentRegionName} / ${region.regionName}`;
    }
    return `${env ? env.envName : '-'} / ${region ? region.regionName : '-'}`;
  }
  if (query.envId) {
    const env = envIndex[query.envId];
    return env ? env.envName : t('infrastructure.allScope');
  }
  return t('infrastructure.allScope');
}

function sourceLabel(sourceType) {
  return sourceType === 'OMP' ? 'OMP' : t('executor.sourceManual');
}

function connectionLabel(status) {
  if (status === 'NORMAL') {
    return t('executor.connectionNormal');
  }
  if (status === 'ERROR') {
    return t('executor.connectionError');
  }
  return t('executor.connectionUnknown');
}

function agentStatusLabel(status) {
  if (status === 'ONLINE') {
    return t('executor.agentOnline');
  }
  if (status === 'OFFLINE') {
    return t('executor.agentOffline');
  }
  return t('executor.connectionUnknown');
}

function optionLabel(label) {
  return label && label.indexOf('.') > 0 ? t(label) : t(label);
}

function formatTime(value) {
  if (!value) {
    return '-';
  }
  return new Date(value).toLocaleString();
}

function normalizeForm(form) {
  if ((form.sshAuthType || 'PASSWORD') === 'PRIVATE_KEY') {
    return { ...form, sshPassword: '' };
  }
  return { ...form, sshPrivateKey: '' };
}
