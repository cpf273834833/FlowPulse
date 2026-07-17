import React from 'react';
import Modal from './Modal';
import { t } from '../i18n';

export default function ConfirmDialog({ title, content, onCancel, onConfirm, confirmText }) {
  return (
    <Modal
      title={title}
      onClose={onCancel}
      footer={(
        <>
          <button className="fp-button" type="button" onClick={onCancel}>{t('cancel')}</button>
          <button className="fp-button fp-button--danger" type="button" onClick={onConfirm}>{confirmText || t('confirmDelete')}</button>
        </>
      )}
    >
      <p className="fp-confirm-content">{content}</p>
    </Modal>
  );
}
