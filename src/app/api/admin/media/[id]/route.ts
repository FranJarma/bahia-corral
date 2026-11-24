import { sql } from 'drizzle-orm';
import { NextResponse } from 'next/server';

import { resultRows, runTenantTx } from '@/infrastructure/db/tenant-transaction';
import { failResponse } from '@/infrastructure/http/route';
import { createR2StoragePort } from '@/infrastructure/storage/storage-port';
import { getAdminActor } from '@/modules/identity-access/application/admin-actor';
import { requirePermission } from '@/modules/identity-access/domain/permissions';

export const dynamic = 'force-dynamic';
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const actor = await getAdminActor();
    if (!actor) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    requirePermission(actor.role, 'payments:read');
    const { id } = await params;
    const files = await runTenantTx({ tenantId: actor.tenantId, actorId: actor.userId, actorType: 'USER' }, async (tx) =>
      resultRows<{ bucket: string; object_key: string }>(await tx.execute(sql`
        SELECT m.bucket,m.object_key FROM media_assets m
        JOIN payment_evidence e ON e.tenant_id=m.tenant_id AND e.asset_id=m.id
        WHERE m.tenant_id=${actor.tenantId} AND m.id=${id} AND m.status='VALIDATED' LIMIT 1`)),
    );
    if (!files[0]) return NextResponse.json({ error: 'Archivo no encontrado' }, { status: 404 });
    const url = await createR2StoragePort().presignDownload({ bucket: files[0].bucket, objectKey: files[0].object_key });
    return NextResponse.redirect(url, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) {
    return failResponse(error);
  }
}
