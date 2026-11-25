'use client';

import type { ReactNode } from 'react';
import { SearchField } from '@/modules/shared-ui/search-field';
import Link from 'next/link';
import { useMemo, useState } from 'react';

type Row = Record<string, string>;
type Column = { key: string; label: string; weight?: 'bold'; badge?: boolean };
export function AdminRecordsTable({
  rows,
  columns,
  emptyMessage,
  searchPlaceholder = 'Buscar...',
  actionLabel,
  actionKey,
  actions,
}: {
  rows: Row[];
  columns: Column[];
  emptyMessage: string;
  searchPlaceholder?: string;
  actionLabel?: string;
  actionKey?: string;
  actions?: (row: Row) => ReactNode;
}) {
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(0);
  const matches = useMemo(
    () =>
      rows.filter((row) =>
        Object.values(row).some((v) =>
          v.toLocaleLowerCase('es-AR').includes(query.toLocaleLowerCase('es-AR')),
        ),
      ),
    [rows, query],
  );
  const pages = Math.max(1, Math.ceil(matches.length / 7));
  const shown = matches.slice(Math.min(page, pages - 1) * 7, (Math.min(page, pages - 1) + 1) * 7);
  return (
    <section>
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <SearchField className="w-full max-w-[420px]" value={query} placeholder={searchPlaceholder}
          onChange={value => { setQuery(value); setPage(0); }} />
        <span className="pb-2 text-[11px] text-muted">{matches.length} registros</span>
      </div>
      <div className="overflow-x-auto rounded-2xl bg-cream-soft">
        <table className="admin-table min-w-[640px]">
          <thead>
            <tr>
              {columns.map((c) => (
                <th key={c.key} scope="col">
                  {c.label}
                </th>
              ))}
              {(actionKey || actions) && <th scope="col">Acciones</th>}
            </tr>
          </thead>
          <tbody>
            {shown.map((row, i) => (
              <tr key={row.id ?? i}>
                {columns.map((c) => (
                  <td key={c.key} className={c.weight === 'bold' ? 'font-semibold' : ''}>
                    {c.badge ? (
                      <span
                        className={`status-pill ${row[c.key]?.toLocaleLowerCase('es-AR').includes('pendiente') ? 'status-pill--pending' : row[c.key]?.toLocaleLowerCase('es-AR').includes('cancel') ? 'status-pill--cancelled' : 'status-pill--ready'}`}
                      >
                        {row[c.key]}
                      </span>
                    ) : (
                      row[c.key] || '—'
                    )}
                  </td>
                ))}
                {actions && <td>{actions(row)}</td>}
                {actionKey && !actions && (
                  <td>
                    <Link
                      href={row[actionKey] ?? '#'}
                      className="text-xs font-semibold hover:underline"
                    >
                      {actionLabel ?? 'Ver detalle'} →
                    </Link>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
        {!shown.length && <p className="p-9 text-center text-xs text-muted">{emptyMessage}</p>}
      </div>
      <div className="mt-5 flex flex-wrap items-center justify-between gap-3 text-[11px] text-muted">
        <span>
          {matches.length
            ? `Mostrando ${page * 7 + 1}–${Math.min((page + 1) * 7, matches.length)} de ${matches.length}`
            : 'Sin resultados'}
        </span>
        <div className="flex items-center gap-5">
          <button disabled={page === 0} onClick={() => setPage((v) => Math.max(0, v - 1))}>
            ← Anterior
          </button>
          <strong className="text-ink">
            Página {Math.min(page + 1, pages)} de {pages}
          </strong>
          <button disabled={page >= pages - 1} onClick={() => setPage((v) => v + 1)}>
            Siguiente →
          </button>
        </div>
      </div>
    </section>
  );
}
