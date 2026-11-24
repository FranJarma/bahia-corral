import Link from 'next/link';

import { PUBLIC_UNITS } from '@/modules/accommodations/domain/seed-units';

export function UnitCatalog() {
  return (
    <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
      {PUBLIC_UNITS.map((unit) => (
        <article key={unit.code} className="surface-card flex flex-col">
          <div className="flex aspect-[4/3] items-end bg-gradient-to-br from-[#c7d3c7] via-[#aabcb6] to-[#7f9c9b] p-4">
            <span className="rounded-full bg-cream px-3 py-1 text-xs font-semibold text-ink">
              {unit.label}
            </span>
          </div>
          <div className="flex flex-1 flex-col gap-3 p-6">
            <h3 className="editorial text-2xl font-semibold">{unit.name}</h3>
            <p className="min-h-12 text-sm leading-relaxed text-muted">{unit.description}</p>
            <p className="text-sm text-muted">Hasta {unit.capacityTotal} huéspedes</p>
            <div className="mt-auto flex flex-wrap items-center justify-between gap-2 border-t border-[#ede7dd] pt-4">
              <span className="text-sm font-semibold">Desde {unit.fromPrice} / noche</span>
              <Link
                href={`/alojamientos/${unit.slug}`}
                className="text-sm font-semibold text-brand underline underline-offset-4"
              >
                Ver detalle
              </Link>
            </div>
          </div>
        </article>
      ))}
    </div>
  );
}
