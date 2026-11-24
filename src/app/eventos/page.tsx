import type {Metadata} from 'next';
import {SiteHeader} from '@/modules/accommodations/ui/site-header';
import {EventInquiryForm} from '@/modules/events/ui/event-inquiry-form';
export const metadata:Metadata={title:'Eventos en Bahía Corral'};
export default function EventsPage(){return <><SiteHeader/><main className="public-container py-16"><div className="grid gap-10 lg:grid-cols-2"><div><p className="text-xs font-semibold uppercase tracking-widest text-brand">Eventos y encuentros</p><h1 className="editorial mt-3 text-5xl">Momentos que merecen un lugar especial</h1><p className="mt-6 max-w-lg text-lg leading-relaxed text-muted">Contanos qué evento estás imaginando y nuestro equipo preparará una propuesta personalizada. Los eventos se cotizan y confirman de manera individual.</p></div><EventInquiryForm/></div></main></>}
