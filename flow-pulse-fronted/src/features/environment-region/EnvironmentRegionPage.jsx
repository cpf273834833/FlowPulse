import React, { useEffect, useMemo, useState } from 'react';
import ApiOutlined from '@uyun/icons/ApiOutlined';
import CheckCircleOutlined from '@uyun/icons/CheckCircleOutlined';
import CloudServerOutlined from '@uyun/icons/CloudServerOutlined';
import CodeSandboxOutlined from '@uyun/icons/CodeSandboxOutlined';
import DatabaseOutlined from '@uyun/icons/DatabaseOutlined';
import DeleteOutlined from '@uyun/icons/DeleteOutlined';
import EditOutlined from '@uyun/icons/EditOutlined';
import FilterOutlined from '@uyun/icons/FilterOutlined';
import PlusOutlined from '@uyun/icons/PlusOutlined';
import SafetyCertificateOutlined from '@uyun/icons/SafetyCertificateOutlined';
import SearchOutlined from '@uyun/icons/SearchOutlined';
import SettingOutlined from '@uyun/icons/SettingOutlined';
import { environmentRegionApi } from '../../api/environmentRegionApi';
import Modal from '../../components/Modal';
import { StatCards } from '../../components/PageChrome';
import ConfirmDialog from '../../components/ConfirmDialog';
import Toast from '../../components/Toast';
import { t } from '../../i18n';

const EMPTY_PAGE = {
  environments: [],
  regions: [],
  platformConfigs: [],
  stats: [],
};

const DEFAULT_ENV_FORM = {
  envCode: '',
  envName: '',
  description: '',
};

const DEFAULT_REGION_FORM = {
  envId: '',
  parentRegionId: '',
  regionType: 'MANAGEMENT',
  regionCode: '',
  regionName: '',
  description: '',
};

const DEFAULT_PLATFORM_FORM = {
  regionId: '',
  name: '',
  platformBaseUrl: '',
  ompBaseUrl: '',
  platformAuthType: 'API_KEY',
  platformApiKey: '',
  ompAuthType: 'API_KEY',
  ompApiKey: '',
  syncEnabled: true,
  syncIntervalSec: 300,
  status: 'ENABLED',
};

const STAT_ICONS = [
  DatabaseOutlined,
  SafetyCertificateOutlined,
  CodeSandboxOutlined,
  SettingOutlined,
  CheckCircleOutlined,
];

function buildConfigForm(region, existing) {
  return existing
    ? { ...DEFAULT_PLATFORM_FORM, ...existing, regionId: region.id }
    : { ...DEFAULT_PLATFORM_FORM, regionId: region.id, name: `${region.regionName} access config` };
}

function hasPlatformConfig(config) {
  return Boolean(config && config.platformBaseUrl);
}

function hasOmpConfig(config) {
  return Boolean(config && config.ompBaseUrl);
}

export default function EnvironmentRegionPage() {
  const [page, setPage] = useState(EMPTY_PAGE);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [dialog, setDialog] = useState(null);
  const [confirm, setConfirm] = useState(null);
  const [selectedEnvironmentId, setSelectedEnvironmentId] = useState('');
  const [environmentKeyword, setEnvironmentKeyword] = useState('');

  const configIndex = useMemo(() => {
    const index = {};
    page.platformConfigs.forEach((config) => {
      index[config.regionId] = config;
    });
    return index;
  }, [page.platformConfigs]);

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    if (page.environments.length === 0) {
      setSelectedEnvironmentId('');
      return;
    }
    const exists = page.environments.some((environment) => environment.id === selectedEnvironmentId);
    if (!exists) {
      setSelectedEnvironmentId(page.environments[0].id);
    }
  }, [page.environments, selectedEnvironmentId]);

  useEffect(() => {
    if (!message) {
      return undefined;
    }
    const timer = window.setTimeout(() => {
      setMessage('');
    }, 3000);
    return () => window.clearTimeout(timer);
  }, [message]);

  async function load() {
    setLoading(true);
    try {
      const data = await environmentRegionApi.page();
      setPage(data || EMPTY_PAGE);
    } catch (error) {
      setMessage(error.message);
    } finally {
      setLoading(false);
    }
  }

  async function submitEnvironment(form) {
    try {
      if (form.id) {
        await environmentRegionApi.updateEnvironment(form.id, form);
      } else {
        await environmentRegionApi.createEnvironment(form);
      }
      setDialog(null);
      setMessage(t('environmentSaved'));
      await load();
    } catch (error) {
      setMessage(error.message);
    }
  }

  async function submitRegion(form) {
    try {
      const payload = { ...form };
      if (payload.regionType === 'MANAGEMENT') {
        payload.parentRegionId = '';
      }
      if (payload.id) {
        await environmentRegionApi.updateRegion(payload.id, payload);
      } else {
        await environmentRegionApi.createRegion(payload);
      }
      setDialog(null);
      setMessage(t('regionSaved'));
      await load();
    } catch (error) {
      setMessage(error.message);
    }
  }

  async function submitRegionConfig(form, configType) {
    try {
      await environmentRegionApi.savePlatformConfig(form);
      setDialog(null);
      setMessage(configType === 'PLATFORM' ? t('platformSaved') : t('ompSaved'));
      await load();
    } catch (error) {
      setMessage(error.message);
    }
  }

  function openEnvironmentForm(environment) {
    setDialog({
      type: 'environment',
      title: environment ? t('editEnvironment') : t('addEnvironment'),
      form: environment ? { ...environment } : { ...DEFAULT_ENV_FORM },
    });
  }

  function openRegionForm(regionType, envId, parentRegionId, region) {
    setDialog({
      type: 'region',
      title: region ? t('editRegion') : (regionType === 'MANAGEMENT' ? t('addManagementRegion') : t('addComputeRegion')),
      form: region ? { ...region } : { ...DEFAULT_REGION_FORM, regionType, envId, parentRegionId: parentRegionId || '' },
    });
  }

  function openRegionConfigForm(region, configType) {
    setDialog({
      type: 'regionConfig',
      configType,
      regionName: region.regionName,
      title: configType === 'PLATFORM' ? t('platformConfig') : t('ompConfig'),
      form: buildConfigForm(region, configIndex[region.id]),
    });
  }

  function requestDelete(type, item) {
    const label = type === 'environment' ? item.envName : item.regionName;
    setConfirm({
      title: t('confirmDelete'),
      content: t('deleteConfirmContent', label),
      onConfirm: async () => {
        try {
          if (type === 'environment') {
            await environmentRegionApi.deleteEnvironment(item.id);
          } else {
            await environmentRegionApi.deleteRegion(item.id);
          }
          setConfirm(null);
          setMessage(t('deleteSuccess'));
          await load();
        } catch (error) {
          setConfirm(null);
          setMessage(error.message);
        }
      },
    });
  }

  const managementRegions = page.regions.filter((region) => region.regionType === 'MANAGEMENT');
  const selectedEnvironment = page.environments.find((environment) => environment.id === selectedEnvironmentId);
  const filteredEnvironments = page.environments.filter((environment) => {
    const keyword = environmentKeyword.trim().toLowerCase();
    if (!keyword) {
      return true;
    }
    return `${environment.envName} ${environment.envCode}`.toLowerCase().includes(keyword);
  });
  const selectedManagementRegions = selectedEnvironment
    ? managementRegions.filter((region) => region.envId === selectedEnvironment.id)
    : [];
  const selectedComputeRegions = selectedEnvironment
    ? page.regions.filter((region) => region.envId === selectedEnvironment.id && region.regionType === 'COMPUTE')
    : [];

  return (
    <section className="fp-page">
      <div className="fp-page__header">
        <div>
          <h1>{t('pageTitle')}</h1>
          <p>{t('pageDesc')}</p>
        </div>
        <button className="fp-button fp-button--primary" type="button" onClick={() => openEnvironmentForm()}>
          <PlusOutlined />
          {t('addEnvironment')}
        </button>
      </div>

      <Toast message={message} onClose={() => setMessage('')} />

      <StatCards
        columns={5}
        stats={[
          {
            key: 'current-scope',
            title: t('pageTitle'),
            value: selectedEnvironment?.envName || t('environmentList'),
            description: '当前统计范围',
            kind: 'resource',
          },
          ...page.stats.map((stat) => ({ ...stat, key: stat.title })),
        ]}
      />

      <div className="fp-workspace">
        <aside className="fp-env-list-panel">
          <div className="fp-section-title">
            <h2>{t('environmentList')}</h2>
          </div>
          <div className="fp-search-box">
            <span className="fp-search-box__icon"><SearchOutlined /></span>
            <input value={environmentKeyword} placeholder={t('searchEnvironment')} onChange={(event) => setEnvironmentKeyword(event.target.value)} />
            <button className="fp-search-box__filter" type="button" aria-label={t('filter')}>
              <FilterOutlined />
            </button>
          </div>
          <div className="fp-env-list">
            {!loading && filteredEnvironments.length === 0 ? <div className="fp-empty fp-empty--small">{t('empty')}</div> : null}
            {filteredEnvironments.map((environment) => {
              const envManagementCount = page.regions.filter((region) => region.envId === environment.id && region.regionType === 'MANAGEMENT').length;
              const envComputeCount = page.regions.filter((region) => region.envId === environment.id && region.regionType === 'COMPUTE').length;
              return (
                <button
                  className={`fp-env-list-card ${environment.id === selectedEnvironmentId ? 'fp-env-list-card--active' : ''}`}
                  key={environment.id}
                  type="button"
                  onClick={() => setSelectedEnvironmentId(environment.id)}
                >
                  <strong>{environment.envName}</strong>
                  <em>{environment.envCode}</em>
                  <span className="fp-env-list-card__meta">
                    <span><SafetyCertificateOutlined /> {t('managementRegion')} {envManagementCount}</span>
                    <span><CodeSandboxOutlined /> {t('computeRegion')} {envComputeCount}</span>
                  </span>
                </button>
              );
            })}
          </div>
        </aside>

        <div className="fp-env-detail-panel">
          {loading ? <div className="fp-card__loading">{t('loading')}</div> : null}
          {!loading && !selectedEnvironment ? <div className="fp-empty">{t('empty')}</div> : null}

          {selectedEnvironment ? (
            <article className="fp-env-detail">
              <div className="fp-env-detail__header">
                <div className="fp-env-title">
                  <h3>{selectedEnvironment.envName}</h3>
                  {selectedEnvironment.description ? <span>{selectedEnvironment.description}</span> : null}
                </div>
                <div className="fp-actions">
                  <button className="fp-button" type="button" onClick={() => openEnvironmentForm(selectedEnvironment)}>
                    <EditOutlined />
                    {t('editEnvironment')}
                  </button>
                  <button className="fp-button fp-button--ghost-danger" type="button" onClick={() => requestDelete('environment', selectedEnvironment)}>
                    <DeleteOutlined />
                    {t('deleteEnvironment')}
                  </button>
                </div>
              </div>

              <section className="fp-region-section">
                <div className="fp-region-section__head">
                  <h4>{t('managementRegion')}({selectedManagementRegions.length})</h4>
                  <button className="fp-button" type="button" onClick={() => openRegionForm('MANAGEMENT', selectedEnvironment.id)}>
                    <PlusOutlined />
                    {t('addManagementRegion')}
                  </button>
                </div>
                <div className="fp-management-list">
                  {selectedManagementRegions.length === 0 ? <div className="fp-empty fp-empty--small">{t('noManagement')}</div> : null}
                  {selectedManagementRegions.map((management) => {
                    const computes = page.regions.filter((region) => region.parentRegionId === management.id);
                    const config = configIndex[management.id];
                    return (
                      <div className="fp-management-card" key={management.id}>
                        <div className="fp-management-card__header">
                          <div>
                            <strong>{management.regionName}</strong>
                            <em>{management.regionCode}</em>
                          </div>
                          <div className="fp-actions">
                            <button className="fp-link-button" type="button" onClick={() => openRegionForm('MANAGEMENT', selectedEnvironment.id, '', management)}>
                              <EditOutlined />
                              {t('edit')}
                            </button>
                            <button className="fp-link-button fp-link-button--danger" type="button" onClick={() => requestDelete('region', management)}>
                              <DeleteOutlined />
                              {t('delete')}
                            </button>
                          </div>
                        </div>

                        <div className="fp-config-grid">
                          <ConfigCard
                            icon={<ApiOutlined />}
                            title={t('platform')}
                            value={config && config.platformBaseUrl}
                            configured={hasPlatformConfig(config)}
                            onConfig={() => openRegionConfigForm(management, 'PLATFORM')}
                          />
                          <ConfigCard
                            icon={<CloudServerOutlined />}
                            title={t('omp')}
                            value={config && config.ompBaseUrl}
                            configured={hasOmpConfig(config)}
                            onConfig={() => openRegionConfigForm(management, 'OMP')}
                          />
                        </div>
                        <div className="fp-compute-children">
                          <div className="fp-compute-children__head">
                            <span>{t('subordinateCompute')} {computes.length} {t('unit')}</span>
                            <button className="fp-link-button" type="button" onClick={() => openRegionForm('COMPUTE', selectedEnvironment.id, management.id)}>
                              <PlusOutlined />
                              {t('addComputeRegion')}
                            </button>
                          </div>
                          {computes.length === 0 ? <div className="fp-empty fp-empty--small">{t('noCompute')}</div> : null}
                          {computes.map((compute) => {
                            const computeConfig = configIndex[compute.id];
                            return (
                              <div className="fp-compute-child" key={compute.id}>
                                <div className="fp-compute-child__main">
                                  <strong>{compute.regionName}</strong>
                                  <em>{compute.regionCode}</em>
                                </div>
                                <ConfigState configured={hasPlatformConfig(computeConfig)} />
                                <ConfigState configured={hasOmpConfig(computeConfig)} />
                                <span className="fp-actions fp-actions--wrap">
                                  <button className="fp-link-button" type="button" onClick={() => openRegionConfigForm(compute, 'PLATFORM')}>
                                    <ApiOutlined />
                                    {t('platformConfig')}
                                  </button>
                                  <button className="fp-link-button" type="button" onClick={() => openRegionConfigForm(compute, 'OMP')}>
                                    <CloudServerOutlined />
                                    {t('ompConfig')}
                                  </button>
                                  <button className="fp-link-button" type="button" onClick={() => openRegionForm('COMPUTE', selectedEnvironment.id, compute.parentRegionId, compute)}>
                                    <EditOutlined />
                                    {t('edit')}
                                  </button>
                                  <button className="fp-link-button fp-link-button--danger" type="button" onClick={() => requestDelete('region', compute)}>
                                    <DeleteOutlined />
                                    {t('delete')}
                                  </button>
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>

              <div className="fp-tip">{t('regionConfigTip')}</div>
            </article>
          ) : null}
        </div>
      </div>

      {dialog && dialog.type === 'environment' ? (
        <EnvironmentForm dialog={dialog} setDialog={setDialog} onSubmit={submitEnvironment} />
      ) : null}
      {dialog && dialog.type === 'region' ? (
        <RegionForm dialog={dialog} setDialog={setDialog} onSubmit={submitRegion} environments={page.environments} regions={page.regions} />
      ) : null}
      {dialog && dialog.type === 'regionConfig' ? (
        <RegionConfigForm dialog={dialog} setDialog={setDialog} onSubmit={submitRegionConfig} />
      ) : null}
      {confirm ? (
        <ConfirmDialog title={confirm.title} content={confirm.content} onCancel={() => setConfirm(null)} onConfirm={confirm.onConfirm} />
      ) : null}
    </section>
  );
}

function ConfigCard({ icon, title, value, configured, onConfig }) {
  return (
    <div className={`fp-config-card ${configured ? 'is-configured' : ''}`}>
      <span className="fp-config-card__icon">{icon}</span>
      <div>
        <strong>{title}</strong>
        <em>{configured ? value : t('unconfigured')}</em>
      </div>
      <button className="fp-button" type="button" onClick={onConfig}>
        <SettingOutlined />
        {t('config')}
      </button>
    </div>
  );
}

function ConfigState({ configured }) {
  return (
    <span className={configured ? 'fp-text-success' : 'fp-text-warning'}>
      {configured ? t('configured') : t('unconfigured')}
    </span>
  );
}

function EnvironmentForm({ dialog, setDialog, onSubmit }) {
  const [form, setForm] = useState(dialog.form);
  return (
    <EntityModal title={dialog.title} onClose={() => setDialog(null)} onSubmit={() => onSubmit(form)}>
      <Field label={t('envCode')} value={form.envCode} onChange={(envCode) => setForm({ ...form, envCode })} />
      <Field label={t('envName')} value={form.envName} onChange={(envName) => setForm({ ...form, envName })} />
      <Field label={t('description')} value={form.description} onChange={(description) => setForm({ ...form, description })} />
    </EntityModal>
  );
}

function RegionForm({ dialog, setDialog, onSubmit, environments, regions }) {
  const [form, setForm] = useState(dialog.form);
  const managementOptions = regions
    .filter((region) => region.regionType === 'MANAGEMENT' && region.envId === form.envId)
    .map((region) => [region.id, region.regionName]);
  return (
    <EntityModal title={dialog.title} onClose={() => setDialog(null)} onSubmit={() => onSubmit(form)}>
      <Select label={t('regionEnv')} value={form.envId} options={environments.map((env) => [env.id, env.envName])} onChange={(envId) => setForm({ ...form, envId, parentRegionId: '' })} />
      <Select label={t('regionType')} value={form.regionType} options={[['MANAGEMENT', t('managementRegion')], ['COMPUTE', t('computeRegion')]]} onChange={(regionType) => setForm({ ...form, regionType, parentRegionId: regionType === 'MANAGEMENT' ? '' : form.parentRegionId })} />
      {form.regionType === 'COMPUTE' ? (
        <Select label={t('parentRegion')} value={form.parentRegionId} options={managementOptions} onChange={(parentRegionId) => setForm({ ...form, parentRegionId })} />
      ) : null}
      <Field label={t('regionCode')} value={form.regionCode} onChange={(regionCode) => setForm({ ...form, regionCode })} />
      <Field label={t('regionName')} value={form.regionName} onChange={(regionName) => setForm({ ...form, regionName })} />
      <Field label={t('description')} value={form.description} onChange={(description) => setForm({ ...form, description })} />
    </EntityModal>
  );
}

function RegionConfigForm({ dialog, setDialog, onSubmit }) {
  const [form, setForm] = useState(dialog.form);
  const isPlatform = dialog.configType === 'PLATFORM';
  return (
    <EntityModal title={`${dialog.regionName} - ${dialog.title}`} onClose={() => setDialog(null)} onSubmit={() => onSubmit(form, dialog.configType)}>
      {isPlatform ? (
        <>
          <Field label={t('platformBaseUrl')} value={form.platformBaseUrl} onChange={(platformBaseUrl) => setForm({ ...form, platformBaseUrl })} />
          <Field label={t('platformApiKey')} value={form.platformApiKey} onChange={(platformApiKey) => setForm({ ...form, platformApiKey })} />
        </>
      ) : (
        <>
          <Field label={t('ompBaseUrl')} value={form.ompBaseUrl} onChange={(ompBaseUrl) => setForm({ ...form, ompBaseUrl })} />
          <Field label={t('ompApiKey')} value={form.ompApiKey} onChange={(ompApiKey) => setForm({ ...form, ompApiKey })} />
        </>
      )}
    </EntityModal>
  );
}

function EntityModal({ title, children, onClose, onSubmit }) {
  return (
    <Modal
      title={title}
      onClose={onClose}
      footer={(
        <>
          <button className="fp-button" type="button" onClick={onClose}>{t('cancel')}</button>
          <button className="fp-button fp-button--primary" type="button" onClick={onSubmit}>{t('save')}</button>
        </>
      )}
    >
      <div className="fp-form">{children}</div>
    </Modal>
  );
}

function Field({ label, value, onChange, type = 'text', placeholder = '' }) {
  return (
    <label className="fp-field">
      <span>{label}</span>
      <input type={type} value={value || ''} placeholder={placeholder} onChange={(event) => onChange(event.target.value)} autoComplete="off" />
    </label>
  );
}

function Select({ label, value, options, onChange }) {
  return (
    <label className="fp-field">
      <span>{label}</span>
      <select value={value || ''} onChange={(event) => onChange(event.target.value)}>
        <option value="">{t('selectPlaceholder')}</option>
        {options.map(([optionValue, labelText]) => (
          <option key={optionValue} value={optionValue}>{labelText}</option>
        ))}
      </select>
    </label>
  );
}
