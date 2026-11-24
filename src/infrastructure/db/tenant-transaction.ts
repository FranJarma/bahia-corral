import { sql } from 'drizzle-orm';

import { getDatabase } from './client';

export type TenantContext = {
  tenantId: string;
  actorId: string;
  actorType: 'USER' | 'SYSTEM' | 'PROVIDER';
};
export type TenantTx = Parameters<Parameters<ReturnType<typeof getDatabase>['transaction']>[0]>[0];

/** La variable del tenant vive sólo durante la transacción PostgreSQL. */
export async function runTenantTx<T>(
  ctx: TenantContext,
  work: (tx: TenantTx) => Promise<T>,
): Promise<T> {
  if (!/^[0-9a-f-]{36}$/i.test(ctx.tenantId) || !ctx.actorId) {
    throw new Error('Contexto de tenant inválido');
  }
  return getDatabase().transaction(async (tx) => {
    await tx.execute(sql`SELECT set_config('app.tenant_id', ${ctx.tenantId}, true)`);
    return work(tx);
  });
}

export function resultRows<T>(data: unknown): T[] {
  if (Array.isArray(data)) return data as T[];
  if (typeof data === 'object' && data !== null && 'rows' in data) {
    return (data as { rows: T[] }).rows;
  }
  throw new Error('Respuesta inesperada de PostgreSQL');
}
