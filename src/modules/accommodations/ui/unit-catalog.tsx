import Image from 'next/image';
import Link from 'next/link';

import { PUBLIC_UNITS } from '@/modules/accommodations/domain/seed-units';

export function UnitCatalog() {
  return (
    <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
      {PUBLIC_UNITS.map((unit) => (
        <article key={unit.code} className="surface-card flex flex-col">
          <div className="relative flex aspect-[4/3] items-end overflow-hidden bg-[#d7ddd4] p-4"><Image src={`/images/${unit.slug}.jpg`} alt={`${unit.name} en Bahía Corral`} fill sizes="(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 400px" className="object-cover"/><span className="relative z-10 rounded-full bg-cream px-3 py-1 text-xs font-semibold text-ink">{unit.label}</span></div>
          <div className="flex flex-1 flex-col gap-3 p-6"><h3 className="editorial text-2xl font-semibold">{unit.name}</h3><p className="min-h-12 text-sm leading-relaxed text-muted">{unit.description}</p><p className="text-sm text-muted">Hasta {unit.capacityTotal} huéspedes</p><div className="mt-auto flex flex-wrap items-center justify-between gap-2 border-t border-[#ede7dd] pt-4"><span className="text-sm font-semibold">Desde {unit.fromPrice} / noche</span><Link href={`/alojamientos/${unit.slug}`} className="text-sm font-semibold text-brand underline underline-offset-4">Ver detalle</Link></div></div>
        </article>
      ))}
    </div>
  );
}
