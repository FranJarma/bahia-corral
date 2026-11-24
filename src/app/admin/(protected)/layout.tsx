import {requireAdminActor} from '@/modules/identity-access/application/admin-actor';
import {AdminShell} from '@/modules/admin/ui/admin-shell';
export const dynamic='force-dynamic';
export default async function ProtectedAdminLayout({children}:{children:React.ReactNode}){
  const actor=await requireAdminActor();return <AdminShell actor={actor}>{children}</AdminShell>;
}
