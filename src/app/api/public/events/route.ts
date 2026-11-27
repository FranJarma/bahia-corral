import { sql } from 'drizzle-orm';
import type { NextRequest } from 'next/server';
import { z } from 'zod';

import { getDefaultTenantId } from '@/infrastructure/db/get-tenant';
import { runTenantTx } from '@/infrastructure/db/tenant-transaction';
import {
  assertTrustedOrigin,
  failResponse,
  jsonInput,
  successJson,
} from '@/infrastructure/http/route';

const input = z.object({
  contactName: z.string().trim().min(3).max(120),
  email: z.email(),
  phone: z.string().trim().min(6).max(30),
  eventType: z.string().trim().min(3).max(50),
  preferredDate: z.string().optional(),
  guestsCount: z.number().int().min(1).max(2000).optional(),
  notes: z.string().max(2000).optional(),
});
export async function POST(request: NextRequest) {
  try {
    assertTrustedOrigin(request);
    const data = await jsonInput(request, input);
    const tenantId = await getDefaultTenantId();
    await runTenantTx({ tenantId, actorId: 'public-events', actorType: 'SYSTEM' }, async (tx) => {
      await tx.execute(sql`INSERT INTO event_inquiries(tenant_id,contact_name,email,phone,event_type,preferred_date,guests_count,notes)
      VALUES(${tenantId},${data.contactName},${data.email},${data.phone},${data.eventType},${data.preferredDate ?? null}::date,${data.guestsCount ?? null},${data.notes ?? null})`);
    });
    return successJson(
      { message: 'Recibimos tu consulta. Bahía Corral se pondrá en contacto.' },
      201,
    );
  } catch (error) {
    return failResponse(error);
  }
}
