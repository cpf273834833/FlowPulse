import React from 'react';

export default function Modal({ title, children, footer, onClose }) {
  return (
    <div className="fp-modal-mask" role="dialog" aria-modal="true">
      <div className="fp-modal">
        <div className="fp-modal__header">
          <h3>{title}</h3>
          <button className="fp-icon-button" type="button" onClick={onClose}>×</button>
        </div>
        <div className="fp-modal__body">{children}</div>
        {footer ? <div className="fp-modal__footer">{footer}</div> : null}
      </div>
    </div>
  );
}
