import { InquiryManager } from '@/modules/admin/ui/contact-managers';
import { PageHeading } from '@/modules/admin/ui/page-heading';
import { listAdminInquiries } from '@/modules/event-inquiries/application/manage-inquiries';
import { requireAdminActor } from '@/modules/identity-access/application/admin-actor';

export default async function Page() {
  const actor = await requireAdminActor();
  const initial = await listAdminInquiries(actor);
  return (
    <>
      <PageHeading
        title="Gestión de eventos"
        subtitle="Registrá consultas de eventos y hacé seguimiento de cada contacto."
      />
      <InquiryManager initial={initial} />
    </>
  );
}
