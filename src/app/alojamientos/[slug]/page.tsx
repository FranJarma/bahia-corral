import { ArrowRight, CalendarDays, Check, Clock, Users, Waves, Wifi } from 'lucide-react';
import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { PUBLIC_UNITS } from '@/modules/accommodations/domain/seed-units';
import { AccommodationGallery } from '@/modules/accommodations/ui/accommodation-gallery';
import { PublicPage } from '@/modules/shared-ui/public-page';

const cabinServices = ['Cocina y horno a gas', 'Calefón', 'Vajilla completa', 'Heladera con freezer', 'Pava eléctrica y microondas'];
const comforts = ['TV con servicio de DirecTV', 'Aire acondicionado frío/calor', 'Ropa de cama y toallas', 'Wi-Fi', 'Asador privado'];
const complexServices = ['Seguridad y cámaras las 24 horas', 'Plaza de juegos para niños', 'Espacios verdes recreativos', 'Pileta no climatizada', 'Acceso a la costa del dique', 'Embarcadero privado'];

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const unit = PUBLIC_UNITS.find(u => u.slug === slug);
  return { title: unit?.name ?? 'Alojamiento', description: unit?.description };
}
export async function generateStaticParams() { return PUBLIC_UNITS.map(unit => ({ slug: unit.slug })); }

function InfoGroup({title,items}: {title:string;items:readonly string[]}) {
  return <div className="rounded-xl bg-[#fcfaf6] p-6"><h3 className="editorial text-[22px]">{title}</h3><ul className="mt-4 grid gap-2 text-xs leading-6 text-muted sm:grid-cols-2">{items.map(item=><li className="flex items-start gap-2" key={item}><Check size={14} className="mt-1 shrink-0 text-[#31765f]"/>{item}</li>)}</ul></div>;
}

export default async function AccommodationDetailPage({params}:{params:Promise<{slug:string}>}) {
  const {slug}=await params;
  const unit=PUBLIC_UNITS.find(x=>x.slug===slug);
  if(!unit) notFound();
  const images = slug === 'cabana-1'
    ? [`/images/${unit.slug}.jpg`, '/images/galeria-cabana-1-2.jpg','/images/galeria-cabana-1-3.jpg','/images/galeria-cabana-1-4.jpg']
    : [`/images/${unit.slug}.jpg`];
  const other=PUBLIC_UNITS.filter(x=>x.slug!==slug).slice(0,3);
  const isRoom=unit.type==='ROOM';
  const isCabin=unit.type==='CABIN';
  return <PublicPage>
    <div className="public-container pb-20 pt-10 md:pt-12">
      <nav aria-label="Migas de pan" className="public-breadcrumb"><Link href="/">Inicio</Link><span>/</span><Link href="/alojamientos">Alojamientos</Link><span>/</span><span aria-current="page">{unit.name}</span></nav>
      <div className="mt-7 md:hidden"><p className="public-kicker">{unit.label}</p><h1 className="editorial mt-2 text-[42px]">{unit.name}</h1><p className="mt-2 text-xs text-muted">Hasta {unit.capacityTotal} huéspedes</p></div>
      <div className="mt-6"><AccommodationGallery name={unit.name} images={images}/></div>
      <div className="mt-7 grid items-start gap-10 lg:grid-cols-[minmax(0,1fr)_300px]">
        <div>
          <p className="public-kicker hidden md:block">{unit.label}</p>
          <h1 className="editorial mt-2 hidden text-[46px] md:block">{unit.name}</h1>
          <p className="mt-2 text-sm leading-7 text-muted">{unit.description}</p>
          <div className="mt-7 flex flex-wrap gap-x-8 gap-y-4 border-y border-[#e8dfd3] py-5 text-[11px] text-muted">
            <span className="flex items-center gap-2"><Users size={17}/> Hasta {unit.capacityTotal} huéspedes</span>
            <span className="flex items-center gap-2"><Wifi size={17}/> Wi-Fi</span>
            <span className="flex items-center gap-2"><Waves size={17}/> Naturaleza y dique</span>
            <span className="flex items-center gap-2"><Clock size={17}/> Check-in 15:00</span>
          </div>
          <h2 className="editorial mt-9 text-[28px]">Características</h2>
          <ul className="mt-4 grid gap-2 text-xs text-muted sm:grid-cols-2">
            {(isRoom ? ['Dormitorio independiente', 'Living comedor', 'Sector de refrigerio', 'Baño privado'] : ['Aire acondicionado', 'Zona de descanso', 'Acceso a los espacios del complejo', 'Quincho y sector exterior']).map(x=><li className="flex gap-2" key={x}><Check size={15} className="text-[#31765f]"/>{x}</li>)}
          </ul>
          <h2 className="editorial mt-10 mb-5 text-[28px]">Lo que incluye tu alojamiento</h2>
          <div className="grid gap-4">
            <InfoGroup title="Distribución" items={isCabin ? ['Dormitorio matrimonial con cama King Size y aire acondicionado', 'Segundo dormitorio con camas individuales y opción marinera', 'Living con dos sofás cama, Smart TV y ventilador de techo'] : isRoom ? ['Dos camas individuales que pueden unirse', 'Living comedor con sofá cama y mesa con sillas'] : ['Dormitorio matrimonial con cama King Size', 'Living comedor con sofá cama marinero para dos personas', 'Smart TV con DirecTV y ventilador de techo']}/>
            <InfoGroup title={isRoom?'Sector de refrigerio':'Cocina y equipamiento'} items={isRoom?['Frigobar y pava eléctrica', 'Baño privado', 'Sin cocina para cocinar ni vajilla']:cabinServices}/>
            {!isRoom&&<InfoGroup title="Confort en tu alojamiento" items={comforts}/>} 
            <InfoGroup title="Espacios del predio" items={complexServices}/>
            <div className="rounded-xl bg-[#fcfaf6] p-6"><h3 className="editorial text-[22px]">Para organizar tu visita</h3><p className="mt-4 text-xs leading-7 text-muted">Ingreso 15:00 · Salida 10:00 · Desayuno 08:00 a 10:00.<br/>Limpieza incluida sin costo adicional en estadías de 3 noches o más.</p></div>
            <div className="rounded-xl bg-[#fcfaf6] p-6"><h3 className="editorial text-[22px]">Tarifas por noche</h3><p className="mt-4 whitespace-pre-line text-xs leading-7 text-muted">{isCabin ? '2–4 personas: $140.000\n5–6 personas: $180.000\n7–8 personas: $200.000' : `${unit.fromPrice} por unidad`}</p><p className="mt-3 text-[11px] leading-6 text-muted">Precios de referencia en ARS por unidad. Menores de 4 años sin cargo; todos cuentan para la capacidad. El importe final depende de las fechas de reserva.</p></div>
          </div>
        </div>
        <aside className="order-first rounded-xl border border-[#e2d7c9] bg-cream-soft p-6 shadow-sm lg:sticky lg:top-6 lg:order-last" aria-label="Reservar alojamiento">
          <p className="text-[11px] text-muted">Desde</p><p className="editorial mt-1 text-[30px]">{unit.fromPrice} <span className="font-sans text-xs text-muted">/ noche</span></p>
          <p className="mt-3 text-[11px] leading-5 text-muted">La tarifa final se calcula según las fechas y los huéspedes.</p>
          <Link href={`/reservar?alojamiento=${unit.slug}`} className="primary-button mt-6 w-full">Reservar ahora <ArrowRight size={15}/></Link>
          <p className="mt-3 flex items-center justify-center gap-1 text-center text-[10px] text-muted"><CalendarDays size={13}/> Confirmación al verificar el pago.</p>
        </aside>
      </div>
      <section className="mt-16 border-t border-[#e4dace] pt-10"><div className="mb-5 flex items-center justify-between"><h2 className="editorial text-[27px]">Otros alojamientos</h2><Link href="/alojamientos" className="text-xs font-semibold">Ver todas <ArrowRight size={14} className="inline"/></Link></div>
        <div className="grid gap-4 md:grid-cols-3">{other.map(item=><Link href={`/alojamientos/${item.slug}`} key={item.slug} className="overflow-hidden rounded-xl bg-cream-soft"><div className="relative aspect-[1.7]"><Image src={`/images/${item.slug}.jpg`} alt={item.name} fill sizes="(max-width:768px) 100vw, 33vw" className="object-cover"/></div><div className="p-4"><h3 className="editorial text-[21px]">{item.name}</h3><p className="mt-1 text-[11px] text-muted">Hasta {item.capacityTotal} huéspedes · Desde {item.fromPrice}</p><span className="mt-2 inline-flex items-center gap-2 text-xs font-semibold">Ver detalle <ArrowRight size={13}/></span></div></Link>)}</div>
      </section>
    </div>
  </PublicPage>;
}
