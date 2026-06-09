import React from 'react';

export interface TableColumn<T> {
  key: string;
  header: React.ReactNode;
  render?: (row: T, index: number) => React.ReactNode;
  className?: string;
}

export interface TableProps<T> {
  columns?: TableColumn<T>[];
  data?: T[];
  loading?: boolean;
  emptyMessage?: string;
  className?: string;
  onRowClick?: (row: T) => void;
  children?: React.ReactNode;
}

export function Table<T>({
  columns = [],
  data = [],
  loading = false,
  emptyMessage = 'Nu există date disponibile.',
  className = '',
  onRowClick,
  children
}: TableProps<T>) {
  
  if (children) {
    return (
      <div className="w-full overflow-x-auto border border-ui-border rounded-ui-2xl bg-white shadow-sm">
        <table className={`w-full border-collapse text-left text-sm text-slate-700 ${className}`}>
          {children}
        </table>
      </div>
    );
  }

  return (
    <div className="w-full overflow-x-auto border border-ui-border rounded-ui-2xl bg-white shadow-sm">
      <table className={`w-full border-collapse text-left text-sm text-slate-700 ${className}`}>
        <thead>
          <tr className="border-b border-ui-border bg-ui-surface-muted/50 select-none">
            {columns.map((col) => (
              <th
                key={col.key}
                className={`px-5 py-4 font-bold text-slate-600 text-xs tracking-wider uppercase ${col.className || ''}`}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-ui-border bg-white">
          {loading ? (
            // Skeleton Loading State
            Array.from({ length: 3 }).map((_, rIdx) => (
              <tr key={rIdx} className="animate-pulse">
                {columns.map((col) => (
                  <td key={col.key} className="px-5 py-4.5">
                    <div className="h-4 bg-slate-200 rounded-md w-3/4" />
                  </td>
                ))}
              </tr>
            ))
          ) : data.length === 0 ? (
            // Empty State
            <tr>
              <td colSpan={columns.length} className="px-5 py-12 text-center text-ui-text-muted">
                {emptyMessage}
              </td>
            </tr>
          ) : (
            // Data Rows
            data.map((row, rIdx) => (
              <tr
                key={rIdx}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                className={`
                  transition-colors hover:bg-ui-surface-muted/30
                  ${onRowClick ? 'cursor-pointer' : ''}
                `}
              >
                {columns.map((col) => (
                  <td key={col.key} className={`px-5 py-4.5 font-medium ${col.className || ''}`}>
                    {col.render ? col.render(row, rIdx) : (row as any)[col.key]}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
