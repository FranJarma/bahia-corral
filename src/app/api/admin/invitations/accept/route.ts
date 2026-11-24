import { createHash } from 'node:crypto';

import { sql } from 'drizzle-orm';
import { headers } from 'next/headers';
import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';

import { getDefaultTenantId } from '@/infrastructure/db/get-tenant';
import { resultRows, runTenantTx } from '@/infrastructure/db/tenant-transaction';
import { assertTrustedOrigin, failResponse, jsonInput, successJson } from '@/infrastructure/http/route';
import { getAuth } from '@/modules/identity-access/application/auth';

const requestSchema = z.object({ token: z.string().min(32).max(200) });

/** Aceptar una invitación sólo con correo verificado del mismo usuario. */
export async function POST(request: NextRequest) {
  try {
    assertTrustedOrigin(request);
    const authSession = await getAuth().api.getSession({ headers: await headers() });
    if (!authSession?.user?.id || !authSession.user.emailVerified) {
      return NextResponse.json({ error: 'Iniciá sesión y verificá tu correo antes de aceptar la invitación' }, { status: 401 });
    }
    const { token } = await jsonInput(request, requestSchema);
    const tokenHash = createHash('sha256').update(token).digest('hex');
    const tenantId = await getDefaultTenantId();
    const ctx = { tenantId, actorId: authSession.user.id, actorType: 'USER' as const };

    return successJson(await runTenantTx(ctx, async (tx) => {
      const [invite] = resultRows<{ id: string; email: string; role: string }>(await tx.execute(sql`
        SELECT id,email,role FROM team_invitations WHERE tenant_id=${tenantId}
          AND token_hash=${tokenHash} AND accepted_at IS NULL AND expires_at>now() FOR UPDATE
      `));
      if (!invite) throw new Error('La invitación venció o ya fue utilizada');
      if (invite.email !== authSession.user.email.toLowerCase()) {
        throw new Error('La invitación pertenece a otro correo electrónico');
      }
      if (!['STAFF','CLEANING'].includes(invite.role)) throw new Error('Rol de invitación inválido');
      await tx.execute(sql`INSERT INTO memberships(tenant_id,user_id,role,active)
        VALUES (${tenantId},${authSession.user.id},${invite.role},true)
        ON CONFLICT(tenant_id,user_id) DO UPDATE SET role=excluded.role,active=true,updated_at=now()`);
      await tx.execute(sql`UPDATE team_invitations SET accepted_at=now()
        WHERE tenant_id=${tenantId} AND id=${invite.id}`);
      return { accepted: true };
    }));
  } catch (error) {
    return failResponse(error);
  }
}
