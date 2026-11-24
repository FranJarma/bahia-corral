import { createHash, randomBytes } from 'node:crypto';

import { sql } from 'drizzle-orm';

import { runTenantTx } from '@/infrastructure/db/tenant-transaction';
import { sendMail } from '@/infrastructure/email/mail-port';
import type { AdminActor } from '@/modules/identity-access/application/admin-actor';
import { requirePermission } from '@/modules/identity-access/domain/permissions';

export async function inviteMember(actor: AdminActor, input: { email: string; role: 'STAFF'|'CLEANING' }) {
  requirePermission(actor.role, 'team:manage');
  const token = randomBytes(32).toString('hex');
  const hash = createHash('sha256').update(token).digest('hex');
  const email = input.email.trim().toLowerCase();
  if (!/^\S+@\S+\.\S+$/.test(email)) throw new Error('Correo inválido');
  const id = crypto.randomUUID();
  await runTenantTx({tenantId:actor.tenantId,actorId:actor.userId,actorType:'USER'},async tx => {
    await tx.execute(sql`INSERT INTO team_invitations(id,tenant_id,email,role,token_hash,expires_at,invited_by)
      VALUES (${id},${actor.tenantId},${email},${input.role},${hash},now()+interval '24 hours',${actor.userId})`);
  });
  const base = process.env.BETTER_AUTH_URL || 'http://localhost:3000';
  await sendMail({to:email,subject:'Invitación al equipo de Bahía Corral',html:`<p>Recibiste una invitación para acceder al equipo de Bahía Corral.</p><p><a href="${base}/admin/aceptar-invitacion?token=${token}">Aceptar invitación</a></p>`});
  return { invitationId: id };
}

export async function deactivateMember(actor: AdminActor, membershipId: string) {
  requirePermission(actor.role,'team:manage');
  await runTenantTx({tenantId:actor.tenantId,actorId:actor.userId,actorType:'USER'},async tx => {
    await tx.execute(sql`UPDATE memberships SET active=false,updated_at=now()
      WHERE tenant_id=${actor.tenantId} AND id=${membershipId} AND role IN ('STAFF','CLEANING')`);
  });
}
