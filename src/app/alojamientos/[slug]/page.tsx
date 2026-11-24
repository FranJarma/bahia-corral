import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { PUBLIC_UNITS } from '@/modules/accommodations/domain/seed-units';
import { SiteHeader } from '@/modules/accommodations/ui/site-header';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const unit = PUBLIC_UNITS.find((u) => u.slug === slug);
  return { title: unit?.name ?? 'Alojamiento', description: unit?.description };
}
export async function generateStaticParams() {
  return PUBLIC_UNITS.map((unit) => ({ slug: unit.slug }));
}
export default async function AccommodationDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const unit = PUBLIC_UNITS.find((x) => x.slug === slug);
  if (!unit) notFound();
  return (
    <>
      <SiteHeader />
      <main className="public-container py-16">
        <Link href="/alojamientos" className="text-sm font-semibold text-brand underline">
          Todos los alojamientos
        </Link>
        <div className="mt-10 grid gap-12 lg:grid-cols-[1.4fr_1fr]">
          <div>
            <div
              className="aspect-[4/3] rounded-2xl bg-gradient-to-br from-[#bfcfc3] to-[#7c9a99]"
              role="img"
              aria-label={`Vista referencial de ${unit.name}`}
            />
            <h1 className="editorial mt-8 text-5xl">{unit.name}</h1>
            <p className="my-5 text-lg leading-relaxed text-muted">{unit.description}</p>
            <p className="text-sm font-semibold">
              Capacidad: hasta {unit.capacityTotal} personas, incluidos menores
            </p>
          </div>
          <aside className="surface-card h-fit p-8">
            <p className="text-sm text-muted">Tarifa orientativa desde</p>
            <p className="mt-2 text-3xl font-semibold">
              {unit.fromPrice} <span className="text-base font-normal text-muted">/ noche</span>
            </p>
            <p className="mt-4 text-sm leading-relaxed text-muted">
              El precio definitivo depende de las fechas y la cantidad de huéspedes. Lo verás antes
              de pagar.
            </p>
            <Link
              href={`/reservar?alojamiento=${unit.slug}`}
              className="primary-button mt-8 w-full"
            >
              Consultar disponibilidad
            </Link>
          </aside>
        </div>
      </main>
    </>
  );
}
