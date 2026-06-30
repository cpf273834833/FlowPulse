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
          <span className="fp-stat__icon">{stat.icon || stat.title?.slice(0, 1) || '-'}</span>
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
