import 'server-only';

import { sql } from 'drizzle-orm';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';

import { getDatabase } from '@/infrastructure/db/client';
import { getDefaultTenantId } from '@/infrastructure/db/get-tenant';
import { resultRows, runTenantTx } from '@/infrastructure/db/tenant-transaction';
import { getAuth } from '@/modules/identity-access/application/auth';
import type { ActorRole } from '@/modules/identity-access/domain/permissions';

export type AdminActor = { userId: string; tenantId: string; role: ActorRole; email: string };

export async function getAdminActor(): Promise<AdminActor | null> {
  const authSession = await getAuth().api.getSession({ headers: await headers() });
  if (!authSession?.user?.id) return null;
  const tenantId = await getDefaultTenantId();
  const adminRows = resultRows<{ user_id: string }>(await getDatabase().execute(
    sql`SELECT user_id FROM platform_admins WHERE user_id=${authSession.user.id}`,
  ));
  if (adminRows[0]) return { userId: authSession.user.id, tenantId, role: 'PLATFORM_ADMIN', email: authSession.user.email };
  const ctx = { tenantId, actorId: authSession.user.id, actorType: 'USER' as const };
  const rows = await runTenantTx(ctx, async tx => resultRows<{role: ActorRole}>(await tx.execute(
    sql`SELECT role FROM memberships WHERE tenant_id=${tenantId} AND user_id=${authSession.user.id} AND active=true LIMIT 1`,
  )));
  if (!rows[0]) return null;
  return { userId: authSession.user.id, tenantId, role: rows[0].role, email: authSession.user.email };
}

export async function requireAdminActor(): Promise<AdminActor> {
  const actor = await getAdminActor();
  if (!actor) redirect('/admin/login');
  return actor;
}
