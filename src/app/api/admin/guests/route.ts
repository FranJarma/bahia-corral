import { type NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { assertTrustedOrigin, failResponse, successJson } from '@/infrastructure/http/route';
import { listAdminGuests, saveGuest } from '@/modules/guests/application/manage-guests';
import { getAdminActor } from '@/modules/identity-access/application/admin-actor';
export const dynamic = 'force-dynamic';
export async function GET() {
  try {
    const actor = await getAdminActor();
    if (!actor) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    return successJson({ guests: await listAdminGuests(actor) });
  } catch (error) {
    return failResponse(error);
  }
}
async function save(request: NextRequest, editing: boolean) {
  try {
    assertTrustedOrigin(request);
    const actor = await getAdminActor();
    if (!actor) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    const body = await request.json();
    const id = editing ? z.object({ id: z.string().uuid() }).parse(body).id : undefined;
    const guest = await saveGuest(actor, body, id);
    return successJson({ guest }, editing ? 200 : 201);
  } catch (error) {
    return failResponse(error);
  }
}
export async function POST(request: NextRequest) {
  return save(request, false);
}
export async function PATCH(request: NextRequest) {
  return save(request, true);
}
