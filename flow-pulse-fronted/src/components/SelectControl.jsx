import React, { useState } from 'react';

export default function SelectControl({ value = '', options = [], onChange, className = '', disabled = false, ariaLabel = '请选择' }) {
  const [open, setOpen] = useState(false);
  const current = options.find(([optionValue]) => String(optionValue) === String(value)) || options[0];

  return (
    <div className={`fp-select-custom ${className} ${disabled ? 'is-disabled' : ''}`} onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false); }}>
      <button className="fp-select-custom__trigger" type="button" aria-label={ariaLabel} aria-expanded={open} disabled={disabled} onClick={() => !disabled && setOpen((currentOpen) => !currentOpen)}>
        <span>{current ? current[1] : ariaLabel}</span><i aria-hidden="true" />
      </button>
      {open ? (
        <div className="fp-select-custom__menu" role="listbox">
          {options.map(([optionValue, label]) => (
            <button className={String(optionValue) === String(value) ? 'is-active' : ''} key={String(optionValue)} type="button" role="option" aria-selected={String(optionValue) === String(value)} onMouseDown={(event) => event.preventDefault()} onClick={() => { onChange(optionValue); setOpen(false); }}>
              {label}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
