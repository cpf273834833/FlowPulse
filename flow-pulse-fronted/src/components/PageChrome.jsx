import React from 'react';

export function PageHeader({ eyebrow, title, description, actions }) {
  return (
    <header className="fp-page-header">
      <div className="fp-page-header__copy">
        {eyebrow ? <span className="fp-page-header__eyebrow">{eyebrow}</span> : null}
        <h1>{title}</h1>
        {description ? <p>{description}</p> : null}
      </div>
      {actions ? <div className="fp-page-header__actions">{actions}</div> : null}
    </header>
  );
}

export function StatCards({ stats = [], columns = 4 }) {
  const className = columns === 5 ? 'fp-stat-grid' : 'fp-stat-grid fp-stat-grid--four';
  return (
    <section className={className}>
      {stats.map((stat) => (
        <article className={`fp-stat fp-stat--${stat.tone || 'default'}`} key={stat.key || stat.title}>
          <StatIcon stat={stat} />
          <div>
            <span>{stat.title}</span>
            <strong>{stat.value}</strong>
            <em>{stat.description}</em>
          </div>
        </article>
      ))}
    </section>
  );
}

export function StatIcon({ stat = {}, compact = false }) {
  const kind = stat.kind || inferStatKind(stat);
  const paths = {
    infrastructure: <><rect x="4" y="5" width="16" height="5" rx="1.5" /><rect x="4" y="14" width="16" height="5" rx="1.5" /><path d="M7 7.5h.01M7 16.5h.01M10 7.5h7M10 16.5h7" /></>,
    task: <><rect x="4" y="5" width="16" height="14" rx="2" /><path d="M8 9h8M8 13h5M8 17h7" /></>,
    topology: <><circle cx="6" cy="7" r="2.5" /><circle cx="18" cy="7" r="2.5" /><circle cx="12" cy="17" r="2.5" /><path d="M8.2 8.4 10.8 15M15.8 8.4 13.2 15M8.5 7h7" /></>,
    alert: <><path d="M12 4 3.8 18h16.4L12 4Z" /><path d="M12 9v4M12 16h.01" /></>,
    critical: <><path d="m13 2-7 11h6l-1 9 7-12h-6l1-8Z" /></>,
    error: <><circle cx="12" cy="12" r="8" /><path d="m9 9 6 6m0-6-6 6" /></>,
    enabled: <><circle cx="12" cy="12" r="8" /><path d="m8.5 12 2.2 2.2 4.8-5" /></>,
    disabled: <><circle cx="12" cy="12" r="8" /><path d="M9 12h6" /></>,
    instance: <><path d="M12 4 5 8v8l7 4 7-4V8l-7-4Z" /><path d="m5 8 7 4 7-4M12 12v8" /></>,
    metric: <><path d="M4 16h3l3-7 4 10 3-6h3M4 20h16" /></>,
    rule: <><path d="M5 7h14M5 12h14M5 17h14" /><circle cx="9" cy="7" r="1.5" /><circle cx="15" cy="12" r="1.5" /><circle cx="11" cy="17" r="1.5" /></>,
    resource: <><ellipse cx="12" cy="6" rx="7" ry="3" /><path d="M5 6v6c0 1.7 3.1 3 7 3s7-1.3 7-3V6M5 12v6c0 1.7 3.1 3 7 3s7-1.3 7-3v-6" /></>,
    channel: <><path d="M18 10a6 6 0 1 0-12 0c0 7-2 7-2 7h16s-2 0-2-7M10 20h4" /></>,
    api: <><path d="M8 12h8M12 8v8" /><rect x="4" y="4" width="16" height="16" rx="4" /></>,
    total: <><rect x="4" y="4" width="6" height="6" rx="1" /><rect x="14" y="4" width="6" height="6" rx="1" /><rect x="4" y="14" width="6" height="6" rx="1" /><rect x="14" y="14" width="6" height="6" rx="1" /></>,
  };
  return <span className={`fp-stat__icon ${compact ? 'fp-stat__icon--compact' : ''}`} aria-hidden="true"><svg viewBox="0 0 24 24">{paths[kind] || paths.total}</svg></span>;
}

function inferStatKind(stat) {
  const text = `${stat.key || ''} ${stat.title || stat.label || ''}`.toLowerCase();
  if (/紧急|critical/.test(text)) return 'critical';
  if (/错误|异常|error/.test(text)) return 'error';
  if (/记录|总数|总量|全部|total/.test(text)) return 'total';
  if (/启用|正常|健康|成功|active|enabled|success/.test(text)) return 'enabled';
  if (/停用|未启用|等待|disabled|waiting/.test(text)) return 'disabled';
  if (/拓扑|topology/.test(text)) return 'topology';
  if (/资源|resource/.test(text)) return 'resource';
  if (/告警|故障|alert/.test(text)) return 'alert';
  if (/采集|任务|task|collection/.test(text)) return 'task';
  if (/基础设施|节点|主机|infrastructure|executor|node/.test(text)) return 'infrastructure';
  if (/指标|metric/.test(text)) return 'metric';
  if (/规则|阈值|rule|threshold/.test(text)) return 'rule';
  if (/渠道|通知|channel|notification/.test(text)) return 'channel';
  if (/实例|对象|instance|object/.test(text)) return 'instance';
  if (/接口|第三方|api/.test(text)) return 'api';
  return 'total';
}

export function SecondaryPage({ backText, onBack, eyebrow, title, description, actions, children }) {
  return (
    <section className="fp-page fp-secondary-page">
      <button className="fp-back-crumb" type="button" onClick={onBack}>
        <span aria-hidden="true">‹</span>
        {backText}
      </button>
      <PageHeader eyebrow={eyebrow} title={title} description={description} actions={actions} />
      {children}
    </section>
  );
}
