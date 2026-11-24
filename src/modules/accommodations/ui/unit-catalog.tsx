import { ArrowRight, Users } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';

import { PUBLIC_UNITS } from '@/modules/accommodations/domain/seed-units';

export function UnitCatalog({ mobileCarousel = false }: { mobileCarousel?: boolean }) {
  return (
    <div
      className={
        mobileCarousel
          ? 'flex snap-x snap-mandatory gap-5 overflow-x-auto pb-3 md:grid md:grid-cols-2 md:overflow-visible xl:grid-cols-3'
          : 'grid gap-5 md:grid-cols-2 xl:grid-cols-3'
      }
    >
      {PUBLIC_UNITS.map((unit) => (
        <article
          key={unit.code}
          className={`surface-card flex flex-col overflow-hidden ${mobileCarousel ? 'w-[min(calc(100vw-48px),365px)] shrink-0 snap-center md:w-auto' : ''}`}
        >
          <Link href={`/alojamientos/${unit.slug}`} className="block">
            <div className="relative aspect-[1.33] overflow-hidden bg-sand">
              <Image
                src={`/images/${unit.slug}.jpg`}
                alt={`${unit.name}, Bahía Corral`}
                fill
                sizes="(max-width: 768px) 82vw, (max-width: 1280px) 50vw, 390px"
                className="object-cover transition-transform duration-300 hover:scale-[1.025]"
              />
              <span className="absolute top-3 left-3 rounded-md bg-[#fcfaf6] px-3 py-1.5 text-[10px] font-semibold text-ink">
                {unit.label}
              </span>
            </div>
          </Link>
          <div className="flex flex-1 flex-col px-5 pt-5 pb-6">
            <h3 className="editorial text-[27px] leading-tight">{unit.name}</h3>
            <p className="mt-2 min-h-[40px] text-[12px] leading-5 text-muted">{unit.description}</p>
            <p className="mt-4 flex items-center gap-2 text-[11px] text-muted">
              <Users size={15} aria-hidden="true" /> Hasta {unit.capacityTotal} huéspedes
            </p>
            <div className="mt-5 flex items-end justify-between gap-2 border-t border-[#e9e0d5] pt-4">
              <p className="text-[12px] text-ink">
                Desde <strong>{unit.fromPrice}</strong>
                <span className="block pt-1 text-[10px] text-muted">por noche</span>
              </p>
              <Link
                href={`/alojamientos/${unit.slug}`}
                className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-ink hover:underline hover:underline-offset-4"
              >
                Ver detalle <ArrowRight size={14} />
              </Link>
            </div>
          </div>
        </article>
      ))}
    </div>
  );
}
