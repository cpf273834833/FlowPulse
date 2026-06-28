import React, { useEffect } from 'react';
import { useState } from 'react';
import EnvironmentRegionPage from './features/environment-region/EnvironmentRegionPage';
import CollectionTaskPage from './features/collection-task/CollectionTaskPage';
import ExecutorNodePage from './features/executor-node/ExecutorNodePage';
import InfrastructurePage from './features/infrastructure/InfrastructurePage';
import MetricCenterPage from './features/metric-center/MetricCenterPage';
import { bindPlatformTheme } from './theme/platformTheme';
import { t } from './i18n';

export default function App() {
  const [activeMenu, setActiveMenu] = useState('environment');
  useEffect(() => bindPlatformTheme(), []);

  return (
    <div className="fp-shell">
      <aside className="fp-sidebar">
        <div className="fp-brand">
          <div className="fp-brand__logo">FP</div>
          <div>
            <strong>{t('appName')}</strong>
            <span>{t('appDesc')}</span>
          </div>
        </div>
        <nav className="fp-nav">
          <div className="fp-nav__item fp-nav__item--muted"><span className="fp-nav__icon" />{t('menuOverview')}</div>
          <div className="fp-nav__item fp-nav__item--muted"><span className="fp-nav__icon" />{t('menuTopology')}</div>
          <button className={`fp-nav__item ${activeMenu === 'environment' ? 'fp-nav__item--active' : ''}`} type="button" onClick={() => setActiveMenu('environment')}>
            <span className="fp-nav__icon" />{t('menuEnvironmentRegion')}
          </button>
          <button className={`fp-nav__item ${activeMenu === 'infrastructure' ? 'fp-nav__item--active' : ''}`} type="button" onClick={() => setActiveMenu('infrastructure')}>
            <span className="fp-nav__icon" />{t('menuInfrastructure')}
          </button>
          <button className={`fp-nav__item ${activeMenu === 'executor' ? 'fp-nav__item--active' : ''}`} type="button" onClick={() => setActiveMenu('executor')}>
            <span className="fp-nav__icon" />{t('menuExecutorNode')}
          </button>
          <button className={`fp-nav__item ${activeMenu === 'metric' ? 'fp-nav__item--active' : ''}`} type="button" onClick={() => setActiveMenu('metric')}>
            <span className="fp-nav__icon" />{t('menuMetricCenter')}
          </button>
          <button className={`fp-nav__item ${activeMenu === 'collectionTask' ? 'fp-nav__item--active' : ''}`} type="button" onClick={() => setActiveMenu('collectionTask')}>
            <span className="fp-nav__icon" />{t('menuCollectionTask')}
          </button>
        </nav>
        <div className="fp-sidebar__collapse">{t('collapse')}</div>
      </aside>
      <main className="fp-main">
        {activeMenu === 'environment' ? <EnvironmentRegionPage /> : null}
        {activeMenu === 'infrastructure' ? <InfrastructurePage /> : null}
        {activeMenu === 'executor' ? <ExecutorNodePage /> : null}
        {activeMenu === 'metric' ? <MetricCenterPage /> : null}
        {activeMenu === 'collectionTask' ? <CollectionTaskPage /> : null}
      </main>
    </div>
  );
}
