import React, { useEffect, useState } from 'react';
import { notificationApi } from '../../api/notificationApi';
import ConfirmDialog from '../../components/ConfirmDialog';
import { StatCards } from '../../components/PageChrome';
import Toast from '../../components/Toast';
import './NotificationConfigPage.css';

const DEFAULT_FORM = {
  channelCode: '',
  channelName: '',
  channelType: 'THIRD_PARTY',
  endpoint: '',
  apiKey: '',
  enabled: true,
  description: '',
};

export default function NotificationConfigPage() {
  const [channels, setChannels] = useState([]);
  const [mode, setMode] = useState('list');
  const [editingId, setEditingId] = useState('');
  const [form, setForm] = useState(DEFAULT_FORM);
  const [confirm, setConfirm] = useState(null);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    loadChannels();
  }, []);

  async function loadChannels() {
    setChannels(await notificationApi.list());
  }

  function openCreate() {
    setEditingId('');
    setForm({ ...DEFAULT_FORM });
    setMode('edit');
  }

  function openEdit(channel) {
    setEditingId(channel.id);
    setForm({ ...DEFAULT_FORM, ...channel, apiKey: channel.apiKey || '' });
    setMode('edit');
  }

  async function save() {
    if (!form.channelCode || !form.channelName || !form.endpoint) {
      setToast({ type: 'warning', title: '请补全必填信息', message: '渠道编码、名称和接口地址不能为空。' });
      return;
    }
    const response = editingId ? await notificationApi.update(editingId, form) : await notificationApi.create(form);
    setToast({ type: 'success', title: editingId ? '通知渠道已更新' : '通知渠道已创建', message: response.channelName });
    setMode('list');
    loadChannels();
  }

  function requestDelete(channel) {
    setConfirm({
      title: '确认删除通知渠道',
      content: `删除后告警级别变化不会再通过该渠道通知：${channel.channelName}`,
      onCancel: () => setConfirm(null),
      onConfirm: async () => {
        await notificationApi.delete(channel.id);
        setConfirm(null);
        setToast({ type: 'success', title: '通知渠道已删除', message: channel.channelName });
        loadChannels();
      },
    });
  }

  if (mode === 'edit') {
    return (
      <div className="fp-page">
        <button className="fp-link-button fp-back-link" type="button" onClick={() => setMode('list')}>返回通知配置</button>
        <div className="fp-form-header">
          <div>
            <span className="fp-kicker">{editingId ? '编辑通知渠道' : '新增通知渠道'}</span>
            <h1>{form.channelName || form.channelCode || '未命名渠道'}</h1>
            <p>维护第三方通知平台接口地址和 API Key，告警级别发生变化时会通过启用渠道发送通知。</p>
          </div>
          <div className="fp-actions"><button className="fp-button" type="button" onClick={() => setMode('list')}>取消</button><button className="fp-button fp-button--primary" type="button" onClick={save}>保存</button></div>
        </div>
        <section className="fp-card">
          <div className="fp-form fp-form--page">
            <label className="fp-field"><span>渠道编码 *</span><input value={form.channelCode} onChange={(event) => updateForm('channelCode', event.target.value)} /></label>
            <label className="fp-field"><span>渠道名称 *</span><input value={form.channelName} onChange={(event) => updateForm('channelName', event.target.value)} /></label>
            <label className="fp-field"><span>渠道类型</span><select value={form.channelType} onChange={(event) => updateForm('channelType', event.target.value)}><option value="THIRD_PARTY">第三方通知平台</option></select></label>
            <label className="fp-field"><span>启用状态</span><select value={String(form.enabled)} onChange={(event) => updateForm('enabled', event.target.value === 'true')}><option value="true">启用</option><option value="false">停用</option></select></label>
            <label className="fp-field fp-field--wide"><span>接口地址 *</span><input value={form.endpoint} onChange={(event) => updateForm('endpoint', event.target.value)} /></label>
            <label className="fp-field fp-field--wide"><span>API Key</span><input autoComplete="new-password" value={form.apiKey} onChange={(event) => updateForm('apiKey', event.target.value)} /></label>
            <label className="fp-field fp-field--wide"><span>描述</span><textarea value={form.description} onChange={(event) => updateForm('description', event.target.value)} /></label>
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
          <h1>通知配置</h1>
          <p>维护告警通知出口。一期对接第三方通知平台接口，后续可扩展自动动作。</p>
        </div>
        <button className="fp-button fp-button--primary" type="button" onClick={openCreate}>新增通知渠道</button>
      </header>
      <StatCards stats={notificationStats(channels)} />
      <section className="fp-notify-grid">
        {channels.length === 0 ? <div className="fp-empty">暂无通知渠道</div> : null}
        {channels.map((channel) => (
          <article className="fp-notify-card" key={channel.id}>
            <div className="fp-notify-card__head">
              <div><h2>{channel.channelName}</h2><p>{channel.channelCode}</p></div>
              <span className={`fp-status-pill ${channel.enabled ? 'fp-status-pill--normal' : ''}`}>{channel.enabled ? '启用' : '停用'}</span>
            </div>
            <div className="fp-notify-endpoint">{channel.endpoint}</div>
            <p>{channel.description || '暂无描述'}</p>
            <div className="fp-notify-card__foot">
              <span className="fp-mini-tag">{channel.channelType === 'THIRD_PARTY' ? '第三方通知平台' : channel.channelType}</span>
              <div className="fp-actions"><button className="fp-link-button" type="button" onClick={() => openEdit(channel)}>编辑</button><button className="fp-link-button fp-link-button--danger" type="button" onClick={() => requestDelete(channel)}>删除</button></div>
            </div>
          </article>
        ))}
      </section>
      {confirm ? <ConfirmDialog {...confirm} /> : null}
      {toast ? <Toast {...toast} onClose={() => setToast(null)} /> : null}
    </div>
  );

  function updateForm(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }
}

function notificationStats(channels) {
  const enabled = channels.filter((item) => item.enabled).length;
  const thirdParty = channels.filter((item) => item.channelType === 'THIRD_PARTY').length;
  return [
    { key: 'total', title: '通知渠道', value: channels.length, description: '已维护的通知出口', icon: 'N' },
    { key: 'enabled', title: '启用渠道', value: enabled, description: '可用于告警通知', icon: '✓', tone: 'success' },
    { key: 'disabled', title: '停用渠道', value: channels.length - enabled, description: '暂不发送通知', icon: '!' },
    { key: 'thirdParty', title: '第三方平台', value: thirdParty, description: '接口通知平台', icon: 'API' },
  ];
}
