import { ArrowRight } from 'lucide-react';
import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';

import { PublicPage } from '@/modules/shared-ui/public-page';

export const metadata: Metadata = { title: 'Experiencias en Bahía Corral', description: 'Bienestar, náutica y momentos frente al Dique Cabra Corral, Salta.' };
const spaServices = ['Salas de masoterapia','Salas de aromaterapia','Gimnasio','Terapia sensorial','Ducha escocesa','Sauna seco','Hidromasaje','Piscina'];
const nautical = ['Catamarán para paseo o pesca','Experiencias en lancha','Kayak'];
export default function ExperiencesPage() {
  return <PublicPage><section className="public-container pt-14 pb-20 md:pt-20 md:pb-28">
    <header className="mb-14 text-center"><h1 className="editorial text-[38px] leading-tight md:text-[50px]">Experiencias en Bahía Corral</h1><p className="mt-3 text-sm text-muted">Bienestar, náutica y momentos para disfrutar junto al dique.</p></header>
    <article className="grid items-center gap-8 md:grid-cols-2 md:gap-16"><div className="relative aspect-[2/1] overflow-hidden rounded-2xl"><Image src="/images/spa.jpg" alt="Spa y bienestar" fill priority sizes="(max-width:768px) 100vw,520px" className="object-cover"/></div><div><h2 className="editorial text-[30px]">SPA</h2><p className="mt-3 text-xs leading-6 text-muted">Un momento para bajar el ritmo y dedicarte tiempo.</p><ul className="mt-5 grid grid-cols-2 gap-x-6 gap-y-2 text-xs text-muted">{spaServices.map(s=><li key={s}>{s}</li>)}</ul><Link href="/contacto" className="secondary-button mt-7">Consultar experiencias <ArrowRight size={14}/></Link></div></article>
    <article className="mt-16 grid items-center gap-8 md:grid-cols-2 md:gap-16"><div className="md:order-last"><div className="relative aspect-[2/1] overflow-hidden rounded-2xl"><Image src="/images/hero-figma.jpg" alt="Vista panorámica del Dique Cabra Corral" fill sizes="(max-width:768px) 100vw,520px" className="object-cover"/></div></div><div><h2 className="editorial text-[30px]">Náutica</h2><p className="mt-3 text-xs leading-6 text-muted">Descubrí el dique desde el agua, a tu manera.</p><ul className="mt-5 grid gap-2 text-xs text-muted">{nautical.map(s=><li key={s}>· {s}</li>)}</ul><Link href="/contacto" className="secondary-button mt-6">Consultar experiencias <ArrowRight size={14}/></Link></div></article>
    <div className="mt-20"><h2 className="editorial text-[30px]">Restaurante y Cava</h2><p className="mt-3 max-w-2xl text-xs leading-6 text-muted">Restaurante para 150 comensales y cava subterránea para hasta 15 personas. Consultá por estas experiencias.</p><Link href="/contacto" className="secondary-button mt-6">Consultar disponibilidad <ArrowRight size={14}/></Link></div>
  </section></PublicPage>;
}
