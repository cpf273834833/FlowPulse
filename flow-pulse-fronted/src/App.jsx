import React, { useEffect, useState } from 'react';
import EnvironmentRegionPage from './features/environment-region/EnvironmentRegionPage';
import CollectionTaskPage from './features/collection-task/CollectionTaskPage';
import ExecutorNodePage from './features/executor-node/ExecutorNodePage';
import InfrastructurePage from './features/infrastructure/InfrastructurePage';
import LogicalObjectPage from './features/logical-object/LogicalObjectPage';
import MetricCenterPage from './features/metric-center/MetricCenterPage';
import AlertCenterPage from './features/alert-center/AlertCenterPage';
import NotificationConfigPage from './features/notification-config/NotificationConfigPage';
import ThresholdManagementPage from './features/threshold-management/ThresholdManagementPage';
import DataTopologyPage from './features/data-topology/DataTopologyPage';
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
          <button className={`fp-nav__item ${activeMenu === 'topology' ? 'fp-nav__item--active' : ''}`} type="button" onClick={() => navigate('topology')}>
            <span className="fp-nav__icon" />{t('menuTopology')}
          </button>
          <button className={`fp-nav__item ${activeMenu === 'environment' ? 'fp-nav__item--active' : ''}`} type="button" onClick={() => navigate('environment')}>
            <span className="fp-nav__icon" />{t('menuEnvironmentRegion')}
          </button>
          <button className={`fp-nav__item ${activeMenu === 'infrastructure' ? 'fp-nav__item--active' : ''}`} type="button" onClick={() => navigate('infrastructure')}>
            <span className="fp-nav__icon" />{t('menuInfrastructure')}
          </button>
          <button className={`fp-nav__item ${activeMenu === 'logicalObject' ? 'fp-nav__item--active' : ''}`} type="button" onClick={() => navigate('logicalObject')}>
            <span className="fp-nav__icon" />{t('menuLogicalObject')}
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
          <button className={`fp-nav__item ${activeMenu === 'threshold' ? 'fp-nav__item--active' : ''}`} type="button" onClick={() => navigate('threshold')}>
            <span className="fp-nav__icon" />{t('menuThresholdManagement')}
          </button>
          <button className={`fp-nav__item ${activeMenu === 'alert' ? 'fp-nav__item--active' : ''}`} type="button" onClick={() => navigate('alert')}>
            <span className="fp-nav__icon" />{t('menuAlertCenter')}
          </button>
          <button className={`fp-nav__item ${activeMenu === 'notification' ? 'fp-nav__item--active' : ''}`} type="button" onClick={() => navigate('notification')}>
            <span className="fp-nav__icon" />{t('menuNotificationConfig')}
          </button>
        </nav>
        <div className="fp-sidebar__collapse">{t('collapse')}</div>
      </aside>
      <main className="fp-main">
        {activeMenu === 'environment' ? <EnvironmentRegionPage /> : null}
        {activeMenu === 'topology' ? <DataTopologyPage /> : null}
        {activeMenu === 'infrastructure' ? <InfrastructurePage /> : null}
        {activeMenu === 'logicalObject' ? <LogicalObjectPage /> : null}
        {activeMenu === 'executor' ? <ExecutorNodePage /> : null}
        {activeMenu === 'metric' ? <MetricCenterPage /> : null}
        {activeMenu === 'collectionTask' ? <CollectionTaskPage /> : null}
        {activeMenu === 'threshold' ? <ThresholdManagementPage /> : null}
        {activeMenu === 'alert' ? <AlertCenterPage /> : null}
        {activeMenu === 'notification' ? <NotificationConfigPage /> : null}
      </main>
    </div>
  );
}

function menuFromHash() {
  const value = (window.location.hash || '').replace(/^#\/?/, '');
  const map = {
    'environment-region': 'environment',
    environment: 'environment',
    topology: 'topology',
    'data-topology': 'topology',
    infrastructure: 'infrastructure',
    'logical-object': 'logicalObject',
    logicalObject: 'logicalObject',
    'executor-node': 'executor',
    executor: 'executor',
    'metric-center': 'metric',
    metric: 'metric',
    'collection-task': 'collectionTask',
    collectionTask: 'collectionTask',
    'threshold-management': 'threshold',
    threshold: 'threshold',
    'alert-center': 'alert',
    alert: 'alert',
    'notification-config': 'notification',
    notification: 'notification',
  };
  return map[value] || 'environment';
}

function hashFromMenu(menu) {
  const map = {
    environment: '/environment-region',
    topology: '/data-topology',
    infrastructure: '/infrastructure',
    logicalObject: '/logical-object',
    executor: '/executor-node',
    metric: '/metric-center',
    collectionTask: '/collection-task',
    threshold: '/threshold-management',
    alert: '/alert-center',
    notification: '/notification-config',
  };
  return map[menu] || '/environment-region';
}
