import { type NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import {
  assertTrustedOrigin,
  failResponse,
  jsonInput,
  successJson,
} from '@/infrastructure/http/route';
import { getAdminActor } from '@/modules/identity-access/application/admin-actor';
import {
  deactivateMember,
  inviteMember,
} from '@/modules/identity-access/application/team-management';
export async function POST(request: NextRequest) {
  try {
    assertTrustedOrigin(request);
    const actor = await getAdminActor();
    if (!actor) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    const data = await jsonInput(
      request,
      z.object({ email: z.email(), role: z.enum(['STAFF', 'CLEANING']) }),
    );
    return successJson(await inviteMember(actor, data), 201);
  } catch (error) {
    return failResponse(error);
  }
}
export async function DELETE(request: NextRequest) {
  try {
    assertTrustedOrigin(request);
    const actor = await getAdminActor();
    if (!actor) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    const data = await jsonInput(request, z.object({ membershipId: z.string().uuid() }));
    await deactivateMember(actor, data.membershipId);
    return successJson({ updated: true });
  } catch (error) {
    return failResponse(error);
  }
}
