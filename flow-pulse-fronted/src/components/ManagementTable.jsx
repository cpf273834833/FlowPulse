import React from 'react';

export default function ManagementTable({
  columns,
  rows,
  rowKey = (row) => row.id,
  renderCells,
  onRowClick,
  selectedKey,
  emptyText = '暂无数据',
  className = '',
}) {
  const gridTemplate = columns.map((column) => column.width || 'minmax(0, 1fr)').join(' ');
  const tableStyle = { '--fp-table-columns': gridTemplate };

  return (
    <div className={`fp-management-table ${className}`} role="table" style={tableStyle}>
      <div className="fp-management-table__header" role="row">
        {columns.map((column) => (
          <span className={column.align === 'right' ? 'is-right' : ''} key={column.key} role="columnheader">
            {column.label}
          </span>
        ))}
      </div>
      <div className="fp-management-table__body" role="rowgroup">
        {rows.length === 0 ? <div className="fp-management-table__empty">{emptyText}</div> : null}
        {rows.map((row) => {
          const key = rowKey(row);
          const cells = renderCells(row);
          const clickable = Boolean(onRowClick);
          return (
            <div
              className={`fp-management-table__row ${selectedKey === key ? 'is-selected' : ''} ${clickable ? 'is-clickable' : ''}`}
              key={key}
              role="row"
              tabIndex={clickable ? 0 : undefined}
              onClick={clickable ? () => onRowClick(row) : undefined}
              onKeyDown={clickable ? (event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  onRowClick(row);
                }
              } : undefined}
            >
              {columns.map((column, index) => (
                <div className={`fp-management-table__cell ${column.align === 'right' ? 'is-right' : ''}`} data-label={column.label} key={column.key} role="cell">
                  {cells[index]}
                </div>
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}
