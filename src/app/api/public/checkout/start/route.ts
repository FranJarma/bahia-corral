import type { NextRequest } from 'next/server';
import { z } from 'zod';

import { getDefaultTenantId } from '@/infrastructure/db/get-tenant';
import {
  assertTrustedOrigin,
  failResponse,
  jsonInput,
  successJson,
} from '@/infrastructure/http/route';
import { startCheckout } from '@/modules/availability/application/holds';

const input = z.object({
  unitId: z.string().uuid(),
  checkin: z.string(),
  checkout: z.string(),
  adults: z.number().int().min(1).max(20),
  childAges: z.array(z.number().int().min(0).max(17)).max(20),
});
export async function POST(request: NextRequest) {
  try {
    assertTrustedOrigin(request);
    const data = await jsonInput(request, input);
    const tenantId = await getDefaultTenantId();
    const result = await startCheckout(
      { tenantId, actorId: 'public-checkout', actorType: 'SYSTEM' },
      data,
    );
    return successJson(result, 201);
  } catch (error) {
    return failResponse(error);
  }
}
