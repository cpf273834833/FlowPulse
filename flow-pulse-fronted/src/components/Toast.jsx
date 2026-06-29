import React from 'react';
import { t } from '../i18n';

export default function Toast({ message, type, onClose }) {
  if (!message) {
    return null;
  }
  const finalType = type || inferType(message);
  return (
    <button className={`fp-toast fp-toast--${finalType}`} type="button" onClick={onClose}>
      <span className="fp-toast__icon">{icon(finalType)}</span>
      <span className="fp-toast__body">
        <strong>{title(finalType, message)}</strong>
        <em>{message}</em>
      </span>
    </button>
  );
}

function inferType(message) {
  const text = String(message || '').toLowerCase();
  if (text.includes('失败') || text.includes('异常') || text.includes('错误') || text.includes('error') || text.includes('exception')) {
    return 'error';
  }
  if (text.includes('警告') || text.includes('提醒') || text.includes('需要') || text.includes('warning')) {
    return 'warning';
  }
  return 'success';
}

function title(type, message) {
  const text = String(message || '');
  if (text.includes('连接测试通过')) {
    return t('toast.connectionPassed');
  }
  if (text.includes('连接测试失败') || text.includes('无法连接')) {
    return t('toast.connectionFailed');
  }
  if (text.includes('资源同步完成')) {
    return t('toast.syncSucceeded');
  }
  if (text.includes('资源同步失败')) {
    return t('toast.syncFailed');
  }
  if (type === 'error') {
    return t('toast.error');
  }
  if (type === 'warning') {
    return t('toast.warning');
  }
  return t('toast.success');
}

function icon(type) {
  if (type === 'error') {
    return '!';
  }
  if (type === 'warning') {
    return 'i';
  }
  return '✓';
}
