'use client';

import { Search, X } from 'lucide-react';
import Link from 'next/link';
import { useMemo, useState } from 'react';

type Row = Record<string,string>;
type Column = { key:string; label:string; weight?:'bold'; badge?:boolean };
export function AdminRecordsTable({rows,columns,emptyMessage,searchPlaceholder='Buscar...',actionLabel,actionKey}:{rows:Row[];columns:Column[];emptyMessage:string;searchPlaceholder?:string;actionLabel?:string;actionKey?:string}) {
  const [query,setQuery]=useState('');
  const [page,setPage]=useState(0);
  const matches=useMemo(()=>rows.filter(row=>Object.values(row).some(v=>v.toLocaleLowerCase('es-AR').includes(query.toLocaleLowerCase('es-AR')))),[rows,query]);
  const pages=Math.max(1,Math.ceil(matches.length/7));
  const shown=matches.slice(Math.min(page,pages-1)*7,(Math.min(page,pages-1)+1)*7);
  return <section>
    <div className="mb-4 flex flex-wrap items-end justify-between gap-3"><label className="public-form-label w-full max-w-[390px]">Buscar<div className="relative"><Search size={17} className="pointer-events-none absolute left-3 top-[14px] text-muted"/><input className="w-full pl-10 pr-10" placeholder={searchPlaceholder} value={query} onChange={e=>{setQuery(e.target.value);setPage(0);}}/>{query&&<button aria-label="Limpiar búsqueda" onClick={()=>{setQuery('');setPage(0);}} className="absolute right-2 top-1 flex h-10 w-10 items-center justify-center"><X size={16}/></button>}</div></label><span className="pb-2 text-[11px] text-muted">{matches.length} registros</span></div>
    <div className="overflow-x-auto rounded-2xl bg-cream-soft"><table className="admin-table min-w-[640px]"><thead><tr>{columns.map(c=><th key={c.key} scope="col">{c.label}</th>)}{actionKey&&<th scope="col">Acciones</th>}</tr></thead><tbody>{shown.map((row,i)=><tr key={row.id??i}>{columns.map(c=><td key={c.key} className={c.weight==='bold'?'font-semibold':''}>{c.badge?<span className={`status-pill ${row[c.key]?.toLocaleLowerCase('es-AR').includes('pendiente')?'status-pill--pending':row[c.key]?.toLocaleLowerCase('es-AR').includes('cancel')?'status-pill--cancelled':'status-pill--ready'}`}>{row[c.key]}</span>:row[c.key]||'—'}</td>)}{actionKey&&<td><Link href={row[actionKey]??'#'} className="text-xs font-semibold hover:underline">{actionLabel??'Ver detalle'} →</Link></td>}</tr>)}</tbody></table>{!shown.length&&<p className="p-9 text-center text-xs text-muted">{emptyMessage}</p>}</div>
    <div className="mt-5 flex flex-wrap items-center justify-between gap-3 text-[11px] text-muted"><span>{matches.length?`Mostrando ${page*7+1}–${Math.min((page+1)*7,matches.length)} de ${matches.length}`:'Sin resultados'}</span><div className="flex items-center gap-5"><button disabled={page===0} onClick={()=>setPage(v=>Math.max(0,v-1))}>← Anterior</button><strong className="text-ink">Página {Math.min(page+1,pages)} de {pages}</strong><button disabled={page>=pages-1} onClick={()=>setPage(v=>v+1)}>Siguiente →</button></div></div>
  </section>;
}
