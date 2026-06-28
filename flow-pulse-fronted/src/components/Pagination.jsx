import React, { useState } from 'react';
import { t } from '../i18n';

const PAGE_SIZE_OPTIONS = [10, 20, 50, 100];

export default function Pagination({ pageNo = 1, pageSize = 10, total = 0, onChange }) {
  const [targetPage, setTargetPage] = useState(String(pageNo || 1));
  const current = Math.max(1, Number(pageNo) || 1);
  const size = Math.max(1, Number(pageSize) || 10);
  const pageCount = Math.max(1, Math.ceil((Number(total) || 0) / size));

  function jump(nextPage, nextPageSize = size) {
    const normalizedSize = Math.max(1, Number(nextPageSize) || size);
    const normalizedPageCount = Math.max(1, Math.ceil((Number(total) || 0) / normalizedSize));
    const normalizedPage = Math.min(Math.max(1, Number(nextPage) || 1), normalizedPageCount);
    setTargetPage(String(normalizedPage));
    onChange({ pageNo: normalizedPage, pageSize: normalizedSize });
  }

  return (
    <div className="fp-pagination">
      <span>{t('pagination.total', total)}</span>
      <label>
        <span>{t('pagination.pageSize')}</span>
        <select value={size} onChange={(event) => jump(1, Number(event.target.value))}>
          {PAGE_SIZE_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}
        </select>
      </label>
      <button className="fp-button" type="button" disabled={current <= 1} onClick={() => jump(current - 1)}>{t('pagination.prev')}</button>
      <span>{current} / {pageCount}</span>
      <button className="fp-button" type="button" disabled={current >= pageCount} onClick={() => jump(current + 1)}>{t('pagination.next')}</button>
      <label>
        <span>{t('pagination.jump')}</span>
        <input
          value={targetPage}
          onChange={(event) => setTargetPage(event.target.value.replace(/[^\d]/g, ''))}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              jump(targetPage);
            }
          }}
        />
      </label>
      <button className="fp-button" type="button" onClick={() => jump(targetPage)}>{t('pagination.go')}</button>
    </div>
  );
}
