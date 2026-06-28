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
  if (text.indexOf('失败') >= 0 || text.indexOf('异常') >= 0 || text.indexOf('错误') >= 0 || text.indexOf('error') >= 0 || text.indexOf('exception') >= 0) {
    return 'error';
  }
  if (text.indexOf('警告') >= 0 || text.indexOf('需要') >= 0 || text.indexOf('warning') >= 0) {
    return 'warning';
  }
  return 'success';
}

function title(type, message) {
  const text = String(message || '');
  if (text.indexOf('连接测试通过') >= 0) {
    return t('toast.connectionPassed');
  }
  if (text.indexOf('连接测试失败') >= 0) {
    return t('toast.connectionFailed');
  }
  if (text.indexOf('资源同步完成') >= 0) {
    return t('toast.syncSucceeded');
  }
  if (text.indexOf('资源同步失败') >= 0) {
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
