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
import OverviewPage from './features/overview/OverviewPage';
import { bindPlatformTheme } from './theme/platformTheme';
import { t } from './i18n';

const NAV_GROUPS = [
  {
    title: '观测',
    items: [
      { key: 'overview', labelKey: 'menuOverview', icon: 'overview' },
      { key: 'topology', labelKey: 'menuTopology', icon: 'topology' },
      { key: 'alert', labelKey: 'menuAlertCenter', icon: 'alert' },
    ],
  },
  {
    title: '对象',
    items: [
      { key: 'environment', labelKey: 'menuEnvironmentRegion', icon: 'environment' },
      { key: 'infrastructure', labelKey: 'menuInfrastructure', icon: 'infrastructure' },
      { key: 'logicalObject', labelKey: 'menuLogicalObject', icon: 'logical' },
      { key: 'executor', labelKey: 'menuExecutorNode', icon: 'executor' },
    ],
  },
  {
    title: '策略',
    items: [
      { key: 'metric', labelKey: 'menuMetricCenter', icon: 'metric' },
      { key: 'collectionTask', labelKey: 'menuCollectionTask', icon: 'task' },
      { key: 'threshold', labelKey: 'menuThresholdManagement', icon: 'threshold' },
      { key: 'notification', labelKey: 'menuNotificationConfig', icon: 'notification' },
    ],
  },
];

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
        <nav className="fp-nav">
          {NAV_GROUPS.map((group) => (
            <div className="fp-nav__group-block" key={group.title}>
              <div className="fp-nav__group">{group.title}</div>
              {group.items.map((item) => {
                const active = activeMenu === item.key;
                const className = `fp-nav__item ${active ? 'fp-nav__item--active' : ''} ${item.disabled ? 'fp-nav__item--disabled' : ''}`;
                return (
                  <button className={className} type="button" key={item.key} onClick={() => navigate(item.key)}>
                    <NavIcon name={item.icon} />
                    <span>{t(item.labelKey)}</span>
                  </button>
                );
              })}
            </div>
          ))}
        </nav>
        <div className="fp-sidebar__collapse">{t('collapse')}</div>
      </aside>
      <main className="fp-main">
        {activeMenu === 'overview' ? <OverviewPage /> : null}
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

function NavIcon({ name }) {
  const paths = {
    overview: <><path d="M4 13h4V6H4v7Z" /><path d="M10 13h4V3h-4v10Z" /><path d="M16 13h4V8h-4v5Z" /><path d="M4 18h16" /></>,
    topology: <><circle cx="6" cy="7" r="2.5" /><circle cx="18" cy="7" r="2.5" /><circle cx="12" cy="17" r="2.5" /><path d="M8.2 8.4 10.8 15" /><path d="M15.8 8.4 13.2 15" /><path d="M8.5 7h7" /></>,
    alert: <><path d="M12 4 3.8 18h16.4L12 4Z" /><path d="M12 9v4" /><path d="M12 16h.01" /></>,
    environment: <><path d="M4 6h16" /><path d="M6 6v12h12V6" /><path d="M8 10h3" /><path d="M13 10h3" /><path d="M8 14h8" /></>,
    infrastructure: <><rect x="4" y="5" width="16" height="5" rx="1.4" /><rect x="4" y="14" width="16" height="5" rx="1.4" /><path d="M7 7.5h.01" /><path d="M7 16.5h.01" /><path d="M10 7.5h7" /><path d="M10 16.5h7" /></>,
    logical: <><path d="M12 4 5 8v8l7 4 7-4V8l-7-4Z" /><path d="m5 8 7 4 7-4" /><path d="M12 12v8" /></>,
    executor: <><rect x="5" y="4" width="14" height="16" rx="2" /><path d="M9 8h6" /><path d="M9 12h6" /><path d="M9 16h3" /></>,
    metric: <><path d="M4 16h3l3-7 4 10 3-6h3" /><path d="M4 20h16" /></>,
    task: <><rect x="4" y="5" width="16" height="14" rx="2" /><path d="M8 9h8" /><path d="M8 13h5" /><path d="M8 17h7" /></>,
    threshold: <><path d="M5 18 12 5l7 13" /><path d="M8 14h8" /><path d="M10 10h4" /></>,
    notification: <><path d="M18 10a6 6 0 1 0-12 0c0 7-2 7-2 7h16s-2 0-2-7" /><path d="M10 20a2.2 2.2 0 0 0 4 0" /></>,
  };
  return (
    <span className="fp-nav__icon" aria-hidden="true">
      <svg viewBox="0 0 24 24" focusable="false">{paths[name] || paths.overview}</svg>
    </span>
  );
}

function menuFromHash() {
  const value = (window.location.hash || '').replace(/^#\/?/, '');
  if (value.startsWith('alert-center/')) {
    return 'alert';
  }
  const map = {
    'environment-region': 'environment',
    overview: 'overview',
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
    overview: '/overview',
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
