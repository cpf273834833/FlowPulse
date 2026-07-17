import React, { useEffect, useState } from 'react';
import { alertApi } from '../../api/alertApi';
import Pagination from '../../components/Pagination';
import SelectControl from '../../components/SelectControl';
import { StatIcon } from '../../components/PageChrome';
import Toast from '../../components/Toast';
import './AlertCenterPage.css';

const DEFAULT_QUERY = { pageNo: 1, pageSize: 10, keyword: '', level: '', status: 'ACTIVE' };
const ALERT_LEVEL_OPTIONS = [['', '全部级别'], ['REMIND', '提醒'], ['WARNING', '警告'], ['ERROR', '错误'], ['CRITICAL', '紧急'], ['UNKNOWN', '未知']];

export default function AlertCenterPage() {
  const [query, setQuery] = useState(DEFAULT_QUERY);
  const [page, setPage] = useState({ records: [], total: 0, pageNo: 1, pageSize: 10 });
  const [stats, setStats] = useState([]);
  const [detailId, setDetailId] = useState(detailIdFromHash());
  const [selected, setSelected] = useState(null);
  const [events, setEvents] = useState([]);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    loadPage(query);
  }, [query.pageNo, query.pageSize]);

  useEffect(() => {
    function syncDetail() {
      setDetailId(detailIdFromHash());
    }
    window.addEventListener('hashchange', syncDetail);
    return () => window.removeEventListener('hashchange', syncDetail);
  }, []);

  useEffect(() => {
    if (detailId) {
      loadDetail(detailId);
    } else {
      setSelected(null);
      setEvents([]);
    }
  }, [detailId]);

  async function loadPage(nextQuery = query) {
    const response = await alertApi.page(nextQuery);
    const alerts = response.alerts || { records: [], total: 0, pageNo: nextQuery.pageNo, pageSize: nextQuery.pageSize };
    setPage(alerts);
    setStats(response.stats || []);
  }

  async function loadDetail(id) {
    const response = await alertApi.detail(id);
    setSelected(response.alert);
    setEvents(response.events || []);
  }

  function openDetail(alert) {
    window.location.hash = `/alert-center/${encodeURIComponent(alert.id)}`;
  }

  async function acknowledge() {
    if (!selected) {
      return;
    }
    const response = await alertApi.acknowledge(selected.id, 'admin');
    setSelected(response);
    setToast({ type: 'success', title: '告警已确认', message: response.objectName || response.alertKey });
    loadPage(query);
  }

  function search() {
    const nextQuery = { ...query, pageNo: 1 };
    setQuery(nextQuery);
    loadPage(nextQuery);
  }

  function switchStatus(status) {
    const nextQuery = { ...query, pageNo: 1, status };
    setQuery(nextQuery);
    loadPage(nextQuery);
  }

  if (detailId) {
    return (
      <div className="fp-page">
        <header className="fp-page__header fp-alert-detail-header">
          <div>
            <button className="fp-alert-back" type="button" onClick={() => { window.location.hash = '/alert-center'; }}>← 返回告警中心</button>
            <h1>{selected?.objectName || selected?.objectCode || '告警详情'}</h1>
            <p>{selected?.message || '查看本次故障的触发、升级、确认与恢复过程。'}</p>
          </div>
          {selected ? <Level value={selected.currentLevel} /> : null}
        </header>

        <section className="fp-card fp-alert-detail-summary">
          <DetailDatum label="当前级别"><Level value={selected?.currentLevel} /></DetailDatum>
          <DetailDatum label="前一等级" value={levelText(selected?.previousLevel)} />
          <DetailDatum label="触发值" value={selected?.triggerValue ?? '-'} />
          <DetailDatum label="首次触发" value={formatTime(selected?.firstTriggeredAt)} />
          <DetailDatum label="确认状态" value={selected?.acknowledged ? '已确认' : '未确认'} />
          <DetailDatum label="恢复时间" value={formatTime(selected?.recoveredAt)} />
          <div className="fp-alert-detail-summary__action">
            <button className="fp-button fp-button--primary" type="button" disabled={!selected || selected.acknowledged} onClick={acknowledge}>确认故障</button>
          </div>
        </section>

        <section className="fp-card">
          <div className="fp-section-heading"><div><h2>故障过程</h2><p>按时间查看级别变化和处理轨迹。</p></div></div>
          <div className="fp-alert-event-list">
            {events.length === 0 ? <div className="fp-empty">暂无故障过程记录</div> : null}
            {events.map((event) => (
              <div className="fp-alert-event" key={event.id}>
                <span className="fp-alert-event__marker" />
                <div><strong>{levelText(event.fromLevel)} → {levelText(event.toLevel)}</strong><p>{event.message || event.eventType}</p></div>
                <time>{formatTime(event.eventAt)}</time>
              </div>
            ))}
          </div>
        </section>
        {toast ? <Toast {...toast} onClose={() => setToast(null)} /> : null}
      </div>
    );
  }

  return (
    <div className="fp-page">
      <header className="fp-page__header">
        <div>
          <h1>告警中心</h1>
          <p>按一次触发到恢复的故障闭环查看告警，每次恢复后再次触发都会形成新的故障记录。</p>
        </div>
      </header>

      <section className="fp-stat-grid fp-stat-grid--four">
        {(stats.length ? stats : defaultStats()).map((item) => (
          <div className="fp-stat" key={item.title}>
            <StatIcon stat={item} />
            <div><span>{item.title}</span><strong>{item.value}</strong><em>{item.description}</em></div>
          </div>
        ))}
      </section>

      <section className="fp-card">
          <div className="fp-alert-status-tabs">
            <button className={query.status === 'ACTIVE' ? 'is-active' : ''} type="button" onClick={() => switchStatus('ACTIVE')}>
              <strong>活动告警</strong>
              <span>尚未恢复的故障</span>
            </button>
            <button className={query.status === 'RECOVERED' ? 'is-active' : ''} type="button" onClick={() => switchStatus('RECOVERED')}>
              <strong>已关闭告警</strong>
              <span>已经恢复的故障闭环</span>
            </button>
            <button className={query.status === '' ? 'is-active' : ''} type="button" onClick={() => switchStatus('')}>
              <strong>全部告警</strong>
              <span>按故障记录统一查看</span>
            </button>
          </div>
          <div className="fp-filter-row fp-filter-row--alert">
            <label className="fp-inline-search">
              <svg className="fp-inline-search__icon" viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.5" cy="10.5" r="5.5" /><path d="m15 15 4 4" /></svg>
              <input value={query.keyword} placeholder="搜索对象、消息或故障键" onChange={(event) => setQuery({ ...query, keyword: event.target.value })} onKeyDown={(event) => event.key === 'Enter' && search()} />
            </label>
            <SelectControl value={query.level} options={ALERT_LEVEL_OPTIONS} onChange={(level) => setQuery({ ...query, pageNo: 1, level })} />
            <button className="fp-button" type="button" onClick={search}>筛选</button>
          </div>

          <div className="fp-compact-list fp-alert-list">
            {page.records.length === 0 ? <div className="fp-empty">暂无故障记录</div> : null}
            {page.records.map((alert) => (
              <article className="fp-compact-row fp-compact-row--alert" key={alert.id} role="button" tabIndex={0} onClick={() => openDetail(alert)} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') openDetail(alert); }}>
                <div className="fp-compact-row__identity"><strong>{alert.objectName || alert.objectCode || alert.alertKey}</strong><em>{alert.objectType || alert.alertKey}</em></div>
                <div className="fp-compact-row__datum"><span>告警信息</span><strong>{alert.message || '-'}</strong></div>
                <Level value={alert.currentLevel} />
                <div className="fp-compact-row__datum"><span>闭环状态</span><strong>{alert.status === 'RECOVERED' ? '已关闭' : '活动中'}</strong></div>
                <div className="fp-compact-row__datum"><span>最近变化</span><strong>{formatTime(alert.lastChangedAt)}</strong></div>
                <div className="fp-compact-row__actions">
                  <button className="fp-link-button" type="button" onClick={(event) => { event.stopPropagation(); openDetail(alert); }}>详情</button>
                </div>
              </article>
            ))}
          </div>
          <Pagination pageNo={page.pageNo} pageSize={page.pageSize} total={page.total} onChange={(pageNo, pageSize) => setQuery({ ...query, pageNo, pageSize })} />
      </section>
      {toast ? <Toast {...toast} onClose={() => setToast(null)} /> : null}
    </div>
  );
}

function DetailDatum({ label, value, children }) {
  return <div className="fp-alert-detail-datum"><span>{label}</span><strong>{children || value}</strong></div>;
}

function detailIdFromHash() {
  const match = (window.location.hash || '').match(/^#\/?alert-center\/([^/?#]+)/);
  return match ? decodeURIComponent(match[1]) : '';
}

function Level({ value }) {
  return <span className={`fp-alert-level fp-alert-level--${value || 'UNKNOWN'}`}>{levelText(value)}</span>;
}

function levelText(value) {
  const map = { NORMAL: '正常', REMIND: '提醒', WARNING: '警告', ERROR: '错误', CRITICAL: '紧急', UNKNOWN: '未知' };
  return map[value] || value || '-';
}

function formatTime(value) {
  return value ? new Date(value).toLocaleString() : '-';
}

function defaultStats() {
  return [
    { title: '故障记录', value: '0', description: '已形成闭环的故障视图' },
    { title: '活动故障', value: '0', description: '仍在影响对象状态' },
    { title: '紧急', value: '0', description: '需要立即处理' },
    { title: '错误', value: '0', description: '已经触发错误级别' },
  ];
}
