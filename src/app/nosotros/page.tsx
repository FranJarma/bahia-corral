import { ArrowRight } from 'lucide-react';
import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';

import { PublicPage } from '@/modules/shared-ui/public-page';

export const metadata: Metadata = { title: 'Un refugio frente al dique', description: 'Conocé la historia de Bahía Corral, un emprendimiento familiar en el Dique Cabra Corral, Salta.' };

export default function AboutPage() {
  return <PublicPage><div className="public-container py-16 md:py-20">
    <header className="mb-14 text-center"><h1 className="editorial text-[38px] md:text-[50px]">Un refugio frente al dique</h1><p className="mt-3 text-sm text-muted">Bahía Corral, Dique Cabra Corral, Salta.</p></header>
    <section className="grid items-center gap-10 md:grid-cols-2 md:gap-16"><div><h2 className="editorial text-[28px]">Una historia en familia</h2><p className="mt-6 text-xs leading-7 text-muted">Bahía Corral nació de un emprendimiento familiar y del deseo de compartir un lugar especial en el Dique Cabra Corral. Crecimos con esfuerzo, dedicación y una atención cercana, cálida y personalizada.</p><p className="mt-5 text-xs leading-7 text-muted">Hoy reunimos descanso, gastronomía y bienestar en contacto con la naturaleza. Trabajamos para que cada visita sea una oportunidad de compartir, relajarse y crear recuerdos.</p><p className="mt-5 text-xs leading-7 text-muted">La naturaleza nos inspira, la hospitalidad nos identifica y cada huésped nos motiva a seguir creciendo.</p></div><div className="relative aspect-square overflow-hidden rounded-2xl"><Image src="/images/nosotros-familia.jpg" alt="Desayuno familiar en Bahía Corral" fill priority sizes="(max-width:768px) 100vw,520px" className="object-cover"/></div></section>
    <section className="mt-16 grid items-center gap-10 md:grid-cols-2 md:gap-16"><div className="relative aspect-[1.62] overflow-hidden rounded-2xl"><Image src="/images/hero-figma.jpg" alt="Dique Cabra Corral rodeado de sierras" fill sizes="(max-width:768px) 100vw,520px" className="object-cover"/></div><div><h2 className="editorial text-[28px]">A orillas del Dique Cabra Corral</h2><p className="mt-5 text-xs leading-7 text-muted">Sierras, agua y atardeceres salteños forman parte de cada escapada. Estamos en Ruta 47 Km 4,5, Coronel Moldes.</p><Link className="mt-6 inline-flex items-center gap-2 text-xs font-semibold uppercase hover:underline" href="/#ubicacion">Cómo llegar <ArrowRight size={14}/></Link></div></section>
  </div></PublicPage>;
}
