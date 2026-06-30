import React, { useEffect, useState } from 'react';
import { alertApi } from '../../api/alertApi';
import Pagination from '../../components/Pagination';
import Toast from '../../components/Toast';
import './AlertCenterPage.css';

const DEFAULT_QUERY = { pageNo: 1, pageSize: 10, keyword: '', level: '', status: '' };

export default function AlertCenterPage() {
  const [query, setQuery] = useState(DEFAULT_QUERY);
  const [page, setPage] = useState({ records: [], total: 0, pageNo: 1, pageSize: 10 });
  const [stats, setStats] = useState([]);
  const [selected, setSelected] = useState(null);
  const [events, setEvents] = useState([]);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    loadPage(query);
  }, [query.pageNo, query.pageSize]);

  async function loadPage(nextQuery = query) {
    const response = await alertApi.page(nextQuery);
    const alerts = response.alerts || { records: [], total: 0, pageNo: nextQuery.pageNo, pageSize: nextQuery.pageSize };
    setPage(alerts);
    setStats(response.stats || []);
    if (!selected && alerts.records.length > 0) {
      openDetail(alerts.records[0]);
    }
  }

  async function openDetail(alert) {
    const response = await alertApi.detail(alert.id);
    setSelected(response.alert);
    setEvents(response.events || []);
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

  return (
    <div className="fp-page">
      <header className="fp-page__header">
        <div>
          <h1>告警中心</h1>
          <p>查看阈值判定产生的当前告警、级别变化历史和确认状态，为拓扑异常追溯提供依据。</p>
        </div>
      </header>

      <section className="fp-stat-grid fp-stat-grid--four">
        {(stats.length ? stats : defaultStats()).map((item) => (
          <div className="fp-stat" key={item.title}>
            <span className="fp-stat__icon">A</span>
            <div><span>{item.title}</span><strong>{item.value}</strong><em>{item.description}</em></div>
          </div>
        ))}
      </section>

      <section className="fp-alert-board">
        <div className="fp-card">
          <div className="fp-filter-row fp-filter-row--metric">
            <label className="fp-inline-search">
              <span>⌕</span>
              <input value={query.keyword} placeholder="搜索对象、消息或告警键" onChange={(event) => setQuery({ ...query, keyword: event.target.value })} onKeyDown={(event) => event.key === 'Enter' && search()} />
            </label>
            <select className="fp-native-select" value={query.level} onChange={(event) => setQuery({ ...query, pageNo: 1, level: event.target.value })}>
              <option value="">全部级别</option><option value="REMIND">提醒</option><option value="WARNING">警告</option><option value="ERROR">错误</option><option value="CRITICAL">紧急</option><option value="UNKNOWN">未知</option>
            </select>
            <select className="fp-native-select" value={query.status} onChange={(event) => setQuery({ ...query, pageNo: 1, status: event.target.value })}>
              <option value="">全部状态</option><option value="ACTIVE">未恢复</option><option value="RECOVERED">已恢复</option>
            </select>
            <button className="fp-button" type="button" onClick={search}>筛选</button>
          </div>

          <div className="fp-data-table fp-alert-table">
            <div className="fp-data-table__row fp-data-table__row--head"><span>告警对象</span><span>级别</span><span>状态</span><span>告警消息</span><span>最近变化</span><span>操作</span></div>
            {page.records.length === 0 ? <div className="fp-empty">暂无告警</div> : null}
            {page.records.map((alert) => (
              <div className={`fp-data-table__row ${selected?.id === alert.id ? 'is-selected' : ''}`} key={alert.id} onClick={() => openDetail(alert)}>
                <strong>{alert.objectName || alert.objectCode || alert.alertKey}<em>{alert.objectType}</em></strong>
                <span><Level value={alert.currentLevel} /></span>
                <span>{alert.status === 'RECOVERED' ? '已恢复' : '未恢复'}</span>
                <span>{alert.message || '-'}</span>
                <span>{formatTime(alert.lastChangedAt)}</span>
                <div className="fp-actions">
                  <button className="fp-link-button" type="button" onClick={(event) => { event.stopPropagation(); openDetail(alert); }}>详情</button>
                </div>
              </div>
            ))}
          </div>
          <Pagination pageNo={page.pageNo} pageSize={page.pageSize} total={page.total} onChange={(pageNo, pageSize) => setQuery({ ...query, pageNo, pageSize })} />
        </div>

        <aside className="fp-card fp-alert-side">
          <div className="fp-threshold-side__head">
            <h2>{selected?.objectName || '选择一条告警'}</h2>
            <p>{selected?.message || '查看告警当前状态与级别变化轨迹。'}</p>
          </div>
          {selected ? (
            <>
              <div className="fp-threshold-kv">
                <div><span>当前级别</span><strong><Level value={selected.currentLevel} /></strong></div>
                <div><span>前一等级</span><strong>{levelText(selected.previousLevel)}</strong></div>
                <div><span>触发值</span><strong>{selected.triggerValue ?? '-'}</strong></div>
                <div><span>首次触发</span><strong>{formatTime(selected.firstTriggeredAt)}</strong></div>
                <div><span>确认状态</span><strong>{selected.acknowledged ? '已确认' : '未确认'}</strong></div>
              </div>
              <div className="fp-actions fp-side-section">
                <button className="fp-button fp-button--primary" type="button" disabled={selected.acknowledged} onClick={acknowledge}>确认告警</button>
              </div>
              <div className="fp-alert-timeline">
                {events.length === 0 ? <div className="fp-empty fp-empty--small">暂无级别变化历史</div> : null}
                {events.map((event) => (
                  <div className="fp-alert-timeline__item" key={event.id}>
                    <strong>{levelText(event.fromLevel)} → {levelText(event.toLevel)}</strong>
                    <span>{formatTime(event.eventAt)} · {event.message || event.eventType}</span>
                  </div>
                ))}
              </div>
            </>
          ) : <div className="fp-empty">暂无选中告警</div>}
        </aside>
      </section>
      {toast ? <Toast {...toast} onClose={() => setToast(null)} /> : null}
    </div>
  );
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
    { title: '当前告警', value: '0', description: '当前可追踪的告警状态' },
    { title: '未恢复', value: '0', description: '仍在影响对象状态' },
    { title: '紧急', value: '0', description: '需要立即处理' },
    { title: '错误', value: '0', description: '已经触发错误级别' },
  ];
}
