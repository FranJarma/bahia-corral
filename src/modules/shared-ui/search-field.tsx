'use client';
import { Search, X } from 'lucide-react';
import { useId } from 'react';

export function SearchField({ value, onChange, placeholder = 'Buscar...', label = 'Buscar', className = '' }: {
  value: string; onChange: (value: string) => void; placeholder?: string; label?: string; className?: string;
}) {
  const id = useId();
  return <div className={'public-form-label min-w-0 ' + className}>
    <label htmlFor={id}>{label}</label>
    <div className="admin-search">
      <Search size={17} aria-hidden="true" className="admin-search-icon" />
      <input id={id} type="search" value={value} placeholder={placeholder}
        onChange={e => onChange(e.target.value)} autoComplete="off" />
      {value && <button type="button" aria-label="Limpiar búsqueda" className="admin-search-clear" onClick={() => onChange('')}><X size={17} aria-hidden="true" /></button>}
    </div>
  </div>;
}
