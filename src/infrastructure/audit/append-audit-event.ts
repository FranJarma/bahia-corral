import { sql } from 'drizzle-orm';

import type { TenantTx } from '@/infrastructure/db/tenant-transaction';

export type AuditEvent = {
  tenantId: string; actorId: string; actorType: 'USER'|'SYSTEM'|'PROVIDER';
  entity: string; entityId: string; action: string; reason?: string;
  changes?: Record<string,string>; correlationId: string;
};

export async function appendAuditEvent(tx: TenantTx, input: AuditEvent): Promise<void> {
  const changes = input.changes ? JSON.stringify(input.changes) : null;
  await tx.execute(sql`INSERT INTO audit_events(tenant_id,actor_id,actor_type,entity,entity_id,action,reason,changes,correlation_id)
    VALUES (${input.tenantId},${input.actorId},${input.actorType},${input.entity},${input.entityId},
      ${input.action},${input.reason ?? null},${changes}::jsonb,${input.correlationId})`);
}
