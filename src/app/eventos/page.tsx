import type { Metadata } from 'next';

import { EventInquiryForm } from '@/modules/events/ui/event-inquiry-form';
import { PublicPage } from '@/modules/shared-ui/public-page';

export const metadata: Metadata = {
  title: 'Eventos frente al agua',
  description:
    'Eventos sociales y corporativos frente al Dique Cabra Corral, Salta. Solicitá un presupuesto personalizado.',
};

export default function EventsPage() {
  return (
    <PublicPage>
      <section className="public-container py-12 md:py-20">
        <div className="mx-auto max-w-[1040px]">
          <EventInquiryForm />
        </div>
      </section>
    </PublicPage>
  );
}
