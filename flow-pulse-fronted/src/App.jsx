import React, { useEffect, useState } from 'react';
import EnvironmentRegionPage from './features/environment-region/EnvironmentRegionPage';
import CollectionTaskPage from './features/collection-task/CollectionTaskPage';
import ExecutorNodePage from './features/executor-node/ExecutorNodePage';
import InfrastructurePage from './features/infrastructure/InfrastructurePage';
import MetricCenterPage from './features/metric-center/MetricCenterPage';
import { bindPlatformTheme } from './theme/platformTheme';
import { t } from './i18n';

export default function App() {
  const [activeMenu, setActiveMenu] = useState(menuFromHash());

  useEffect(() => bindPlatformTheme(), []);

  useEffect(() => {
    function syncMenu() {
      setActiveMenu(menuFromHash());
    }
    window.addEventListener('hashchange', syncMenu);
    return () => window.removeEventListener('hashchange', syncMenu);
  }, []);

  function navigate(menu) {
    setActiveMenu(menu);
    window.location.hash = hashFromMenu(menu);
  }

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
          <button className={`fp-nav__item ${activeMenu === 'environment' ? 'fp-nav__item--active' : ''}`} type="button" onClick={() => navigate('environment')}>
            <span className="fp-nav__icon" />{t('menuEnvironmentRegion')}
          </button>
          <button className={`fp-nav__item ${activeMenu === 'infrastructure' ? 'fp-nav__item--active' : ''}`} type="button" onClick={() => navigate('infrastructure')}>
            <span className="fp-nav__icon" />{t('menuInfrastructure')}
          </button>
          <button className={`fp-nav__item ${activeMenu === 'executor' ? 'fp-nav__item--active' : ''}`} type="button" onClick={() => navigate('executor')}>
            <span className="fp-nav__icon" />{t('menuExecutorNode')}
          </button>
          <button className={`fp-nav__item ${activeMenu === 'metric' ? 'fp-nav__item--active' : ''}`} type="button" onClick={() => navigate('metric')}>
            <span className="fp-nav__icon" />{t('menuMetricCenter')}
          </button>
          <button className={`fp-nav__item ${activeMenu === 'collectionTask' ? 'fp-nav__item--active' : ''}`} type="button" onClick={() => navigate('collectionTask')}>
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

function menuFromHash() {
  const value = (window.location.hash || '').replace(/^#\/?/, '');
  const map = {
    'environment-region': 'environment',
    environment: 'environment',
    infrastructure: 'infrastructure',
    'executor-node': 'executor',
    executor: 'executor',
    'metric-center': 'metric',
    metric: 'metric',
    'collection-task': 'collectionTask',
    collectionTask: 'collectionTask',
  };
  return map[value] || 'environment';
}

function hashFromMenu(menu) {
  const map = {
    environment: '/environment-region',
    infrastructure: '/infrastructure',
    executor: '/executor-node',
    metric: '/metric-center',
    collectionTask: '/collection-task',
  };
  return map[menu] || '/environment-region';
}
