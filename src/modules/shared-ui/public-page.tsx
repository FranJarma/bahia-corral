import { SiteHeader } from '@/modules/accommodations/ui/site-header';
import { SiteFooter } from '@/modules/shared-ui/site-footer';
import { WhatsAppFloating } from '@/modules/shared-ui/whatsapp-floating';

export function PublicPage({ children }: { children: React.ReactNode }) {
  return (
    <>
      <SiteHeader />
      <main>{children}</main>
      <SiteFooter />
      <WhatsAppFloating />
    </>
  );
}
