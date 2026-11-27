'use client';

import { ArrowRight, Search, SlidersHorizontal, Users } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useMemo, useState } from 'react';

import { PUBLIC_UNITS } from '@/modules/accommodations/domain/seed-units';

type UnitType = 'ALL' | 'CABIN' | 'STUDIO' | 'ROOM';

const choices: { value: UnitType; label: string }[] = [
  { value: 'ALL', label: 'Todos los alojamientos' },
  { value: 'CABIN', label: 'Cabañas familiares' },
  { value: 'STUDIO', label: 'Monoambientes' },
  { value: 'ROOM', label: 'Habitación' },
];

export function AccommodationList() {
  const [type, setType] = useState<UnitType>('ALL');
  const [capacity, setCapacity] = useState(0);
  const [sort, setSort] = useState('all');
  const [search, setSearch] = useState('');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const units = useMemo(() => {
    const found = PUBLIC_UNITS.filter(
      (unit) =>
        (type === 'ALL' || type === unit.type) &&
        unit.capacityTotal >= capacity &&
        unit.name.toLocaleLowerCase('es').includes(search.trim().toLocaleLowerCase('es')),
    );
    if (sort === 'capacity') return [...found].sort((a, b) => b.capacityTotal - a.capacityTotal);
    return found;
  }, [type, capacity, search, sort]);

  return (
    <div className="grid items-start gap-6 lg:grid-cols-[240px_minmax(0,1fr)] lg:gap-8">
      <button
        type="button"
        aria-expanded={filtersOpen}
        onClick={() => setFiltersOpen(!filtersOpen)}
        className="flex min-h-12 w-full items-center justify-between rounded-xl border border-[#e6ddce] bg-[#fcf9f3] px-4 text-sm font-semibold text-ink lg:!hidden"
      >
        <span>Filtrar alojamientos</span>
        <SlidersHorizontal size={17} />
      </button>
      <aside
        className={`${filtersOpen ? 'block' : 'hidden'} h-fit w-full min-w-0 rounded-[16px] border border-[#e6ddce] bg-[#fcf9f3] p-5 lg:!block`}
        aria-label="Filtros de alojamientos"
      >
        <h2 className="mb-4 text-[11.5px] font-medium uppercase tracking-[.18em] text-[#8b9498]">
          Filtrar por
        </h2>
        <fieldset className="min-w-0 border-t border-[#e6ddce] pt-4">
          <legend className="text-[11px] font-semibold uppercase tracking-[.1em] text-ink">
            Tipo
          </legend>
          <div className="mt-2 grid gap-1 text-[12.5px] leading-5 text-muted">
            {choices.map((choice) => (
              <label
                key={choice.value}
                className="flex min-h-8 cursor-pointer items-center gap-2.5 py-1"
              >
                <input
                  type="radio"
                  checked={type === choice.value}
                  onChange={() => setType(choice.value)}
                  name="unitType"
                  className="!h-4 !min-h-0 !w-4 shrink-0 accent-[#173747]"
                />
                {choice.label}
              </label>
            ))}
          </div>
        </fieldset>
        <fieldset className="mt-5 min-w-0 border-t border-[#e6ddce] pt-4">
          <legend className="text-[11px] font-semibold uppercase tracking-[.1em] text-ink">
            Capacidad
          </legend>
          <div className="mt-2 grid gap-1 text-[12.5px] leading-5 text-muted">
            {[0, 2, 4, 6, 8].map((value) => (
              <label key={value} className="flex min-h-8 cursor-pointer items-center gap-2.5 py-1">
                <input
                  type="radio"
                  checked={capacity === value}
                  onChange={() => setCapacity(value)}
                  name="capacity"
                  className="!h-4 !min-h-0 !w-4 shrink-0 accent-[#173747]"
                />
                {value === 0 ? 'Todas' : `Al menos ${value} personas`}
              </label>
            ))}
          </div>
        </fieldset>
        <button
          type="button"
          onClick={() => {
            setType('ALL');
            setCapacity(0);
            setSearch('');
            setSort('all');
          }}
          className="mt-5 text-xs font-semibold text-ink underline underline-offset-4"
        >
          Limpiar filtros
        </button>
      </aside>

      <div className="min-w-0">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs text-muted">{units.length} alojamientos encontrados</p>
          <div className="flex w-full flex-wrap items-center gap-3 sm:w-auto">
            <div className="relative w-full sm:w-[248px]">
              <Search
                aria-hidden="true"
                size={15}
                className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-muted"
              />
              <input
                type="search"
                aria-label="Buscar alojamiento"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar alojamiento"
                className="!h-11 w-full !rounded-[10px] !border-[#d6ccb9] !bg-[#fcfaf6] !pl-11 !pr-4 text-[13px] placeholder:text-muted"
              />
            </div>
            <select
              aria-label="Ordenar resultados"
              value={sort}
              onChange={(e) => setSort(e.target.value)}
              className="!h-11 min-w-[160px] !rounded-[10px] !border-[#d6ccb9] !bg-[#fcfaf6] text-[13px]"
            >
              <option value="all">Orden original</option>
              <option value="capacity">Mayor capacidad</option>
            </select>
          </div>
        </div>
        <div className="grid gap-3">
          {units.map((unit) => (
            <article
              key={unit.code}
              data-accommodation-card
              className="grid overflow-hidden rounded-[14px] bg-cream-soft sm:grid-cols-[220px_minmax(0,1fr)_145px]"
            >
              <Link
                href={`/alojamientos/${unit.slug}`}
                className="relative block aspect-[1.7] overflow-hidden sm:aspect-auto sm:min-h-[150px]"
                aria-label={`Ver ${unit.name}`}
              >
                <Image
                  src={`/images/${unit.slug}.jpg`}
                  alt={unit.name}
                  fill
                  sizes="(max-width: 640px) 100vw, 220px"
                  className="object-cover"
                />
              </Link>
              <div className="min-w-0 px-5 py-4">
                <p className="public-kicker !text-[9px]">{unit.label}</p>
                <h2 className="editorial mt-1 text-[23px]">{unit.name}</h2>
                <p
                  data-accommodation-description
                  className="mt-2 line-clamp-3 h-[60px] text-[11px] leading-5 text-muted"
                >
                  {unit.description}
                </p>
                <p className="mt-4 flex items-center gap-1.5 text-[11px] text-muted">
                  <Users size={14} /> Hasta {unit.capacityTotal} huéspedes · Servicios del complejo
                </p>
              </div>
              <div
                data-accommodation-footer
                className="flex flex-col items-center justify-center gap-3 border-t border-[#eae0d4] px-4 py-4 sm:border-t-0 sm:border-l"
              >
                <span className="text-xs text-muted">Desde</span>
                <span className="editorial text-[22px]">{unit.fromPrice}</span>
                <span className="text-[10px] text-muted">por noche</span>
                <Link
                  href={`/alojamientos/${unit.slug}`}
                  className="primary-button !min-h-[36px] !px-5 !text-[10px]"
                >
                  Ver detalle <ArrowRight size={13} />
                </Link>
              </div>
            </article>
          ))}
          {units.length === 0 && (
            <div className="rounded-xl bg-cream-soft p-10 text-center">
              <p className="editorial text-2xl">No encontramos alojamientos con esos filtros</p>
              <p className="mt-3 text-xs text-muted">
                Probá con otra capacidad o tipo de alojamiento.
              </p>
              <button
                type="button"
                className="secondary-button mt-5"
                onClick={() => {
                  setType('ALL');
                  setCapacity(0);
                  setSearch('');
                }}
              >
                Ver todos
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
