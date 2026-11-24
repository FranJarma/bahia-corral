import { randomUUID } from 'node:crypto';

import { sql } from 'drizzle-orm';
import { type NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { resultRows, runTenantTx } from '@/infrastructure/db/tenant-transaction';
import {
  assertTrustedOrigin,
  failResponse,
  jsonInput,
  successJson,
} from '@/infrastructure/http/route';
import {
  checkFileSignature,
  createR2StoragePort,
  privateBucket,
} from '@/infrastructure/storage/storage-port';
import { getAdminActor } from '@/modules/identity-access/application/admin-actor';
import { requirePermission } from '@/modules/identity-access/domain/permissions';

const uploadRequest = z.object({
  contentType: z.enum(['application/pdf', 'image/jpeg', 'image/png']),
  sizeBytes: z.number().int().min(32).max(8_000_000),
  originalName: z.string().min(1).max(120),
});
const linkRequest = z.object({ assetId: z.string().uuid(), reservationId: z.string().uuid() });

export async function POST(request: NextRequest) {
  try {
    assertTrustedOrigin(request);
    const actor = await getAdminActor();
    if (!actor) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    requirePermission(actor.role, 'payments:register');
    const input = await jsonInput(request, uploadRequest);
    const id = randomUUID();
    const objectKey = `${actor.tenantId}/evidence/staging/${id}`;
    const bucket = privateBucket();
    const url = await createR2StoragePort().presignUpload({
      bucket,
      objectKey,
      contentType: input.contentType,
    });
    await runTenantTx(
      { tenantId: actor.tenantId, actorId: actor.userId, actorType: 'USER' },
      async (tx) => {
        await tx.execute(sql`INSERT INTO media_assets
        (id,tenant_id,bucket,object_key,original_name,content_type,size_bytes,public,status)
        VALUES (${id},${actor.tenantId},${bucket},${objectKey},${input.originalName},
          ${input.contentType},${input.sizeBytes},false,'PENDING')`);
      },
    );
    return successJson({ assetId: id, uploadUrl: url, expiresInSeconds: 300 }, 201);
  } catch (error) {
    return failResponse(error);
  }
}

export async function PATCH(request: NextRequest) {
  try {
    assertTrustedOrigin(request);
    const actor = await getAdminActor();
    if (!actor) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    requirePermission(actor.role, 'payments:register');
    const input = await jsonInput(request, linkRequest);
    const ctx = { tenantId: actor.tenantId, actorId: actor.userId, actorType: 'USER' as const };
    const [file, reservation] = await runTenantTx(ctx, async (tx) => {
      const file = resultRows<{
        id: string;
        status: string;
        content_type: string;
        size_bytes: string;
        bucket: string;
        object_key: string;
      }>(
        await tx.execute(sql`SELECT id,status,content_type,size_bytes::text,bucket,object_key
        FROM media_assets WHERE tenant_id=${ctx.tenantId} AND id=${input.assetId}`),
      );
      const reservation = resultRows<{ id: string }>(
        await tx.execute(sql`SELECT id FROM reservations
        WHERE tenant_id=${ctx.tenantId} AND id=${input.reservationId}`),
      );
      return [file[0], reservation[0]] as const;
    });
    if (!file || !reservation)
      return NextResponse.json({ error: 'Archivo o reserva inexistente' }, { status: 404 });
    if (file.status === 'REJECTED')
      return NextResponse.json({ error: 'Archivo rechazado' }, { status: 409 });
    const store = createR2StoragePort();
    const location = { bucket: file.bucket, objectKey: file.object_key };
    const info = await store.stat(location);
    const expectedSize = Number(file.size_bytes);
    if (
      info.sizeBytes !== expectedSize ||
      info.sizeBytes > 8_000_000 ||
      info.contentType !== file.content_type
    ) {
      return NextResponse.json(
        { error: 'Tamaño o formato no coinciden con lo autorizado' },
        { status: 422 },
      );
    }
    const bytes = await store.read(location);
    if (!checkFileSignature(bytes, file.content_type)) {
      return NextResponse.json({ error: 'Contenido del archivo inválido' }, { status: 422 });
    }
    await runTenantTx(ctx, async (tx) => {
      await tx.execute(
        sql`UPDATE media_assets SET status='VALIDATED' WHERE tenant_id=${ctx.tenantId} AND id=${file.id}`,
      );
      await tx.execute(sql`INSERT INTO payment_evidence(tenant_id,reservation_id,asset_id)
        VALUES(${ctx.tenantId},${input.reservationId},${file.id})`);
    });
    return successJson({ linked: true });
  } catch (error) {
    return failResponse(error);
  }
}
