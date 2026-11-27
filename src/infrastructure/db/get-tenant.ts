import { sql } from 'drizzle-orm';

import { getDatabase } from './client';
import { resultRows } from './tenant-transaction';

export async function getDefaultTenantId(): Promise<string> {
  const slug = process.env.BAHIA_DEFAULT_TENANT_SLUG ?? 'bahia-corral';
  const records = resultRows<{ id: string }>(
    await getDatabase().execute(sql`SELECT id FROM tenants WHERE slug = ${slug} LIMIT 1`),
  );
  if (!records[0]) throw new Error('Tenant de Bahía Corral sin configurar');
  return records[0].id;
}
