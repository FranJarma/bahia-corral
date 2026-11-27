import { randomUUID } from 'node:crypto';

import { sql } from 'drizzle-orm';
import { z } from 'zod';

import { appendAuditEvent } from '@/infrastructure/audit/append-audit-event';
import { resultRows, runTenantTx } from '@/infrastructure/db/tenant-transaction';
import { PUBLIC_UNITS } from '@/modules/accommodations/domain/seed-units';
import type { AdminActor } from '@/modules/identity-access/application/admin-actor';
import { requirePermission } from '@/modules/identity-access/domain/permissions';
import { type RateBandInput, validateRateBands } from '@/modules/pricing/domain/rate-bands';

export type AdminUnit = {
  id: string;
  code: string;
  slug: string;
  name: string;
  type: 'CABIN' | 'STUDIO' | 'ROOM';
  capacity_total: number;
  description: string;
  published: boolean;
  operational_status: 'ACTIVE' | 'INACTIVE';
  image_url: string | null;
  bands: RateBandInput[];
};
const band = z.object({
  minGuests: z.number().int().min(1),
  maxGuests: z.number().int().min(1),
  amountCents: z.string().regex(/^\d+$/),
});
const inputSchema = z.object({
  code: z.string().trim().min(1).max(30),
  slug: z
    .string()
    .trim()
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
    .max(100),
  name: z.string().trim().min(3).max(120),
  type: z.enum(['CABIN', 'STUDIO', 'ROOM']),
  capacityTotal: z.number().int().min(1).max(50),
  description: z.string().trim().max(3000),
  published: z.boolean(),
  operationalStatus: z.enum(['ACTIVE', 'INACTIVE']),
  imageUrl: z
    .string()
    .trim()
    .max(2000)
    .refine(
      (v) => !v || (/^\/images\/[\w./-]+$/.test(v) && !v.includes('..')) || /^https:\/\//.test(v),
      'Usá una URL HTTPS o una ruta de imágenes del sitio.',
    ),
  bands: z.array(band).min(1),
});
type BaseRow = Omit<AdminUnit, 'bands'>;
type BandRow = { unit_id: string; min_guests: number; max_guests: number; amount_cents: string };

export async function listAdminUnits(actor: AdminActor): Promise<AdminUnit[]> {
  requirePermission(actor.role, 'reservations:read');
  return runTenantTx(
    { tenantId: actor.tenantId, actorId: actor.userId, actorType: 'USER' },
    async (tx) => {
      const units = resultRows<BaseRow>(
        await tx.execute(
          sql`SELECT id,code,slug,name,type,capacity_total,description,published,operational_status,image_url FROM accommodation_units WHERE tenant_id=${actor.tenantId} ORDER BY code`,
        ),
      );
      const rates = resultRows<BandRow>(
        await tx.execute(
          sql`SELECT unit_id,min_guests,max_guests,amount_cents::text FROM base_rates WHERE tenant_id=${actor.tenantId} ORDER BY min_guests`,
        ),
      );
      return units.map((unit) => ({
        ...unit,
        image_url:
          unit.image_url ||
          (PUBLIC_UNITS.some((p) => p.slug === unit.slug)
            ? '/images/' + unit.slug + '.jpg'
            : '/images/logo-bahia-corral.png'),
        bands: rates
          .filter((r) => r.unit_id === unit.id)
          .map((r) => ({
            minGuests: r.min_guests,
            maxGuests: r.max_guests,
            amountCents: r.amount_cents,
          })),
      }));
    },
  );
}
export async function saveAccommodation(actor: AdminActor, raw: unknown, id?: string) {
  requirePermission(actor.role, 'accommodations:write');
  requirePermission(actor.role, 'pricing:write');
  const ctx = { tenantId: actor.tenantId, actorId: actor.userId, actorType: 'USER' as const };
  return runTenantTx(ctx, async (tx) => {
    const previous = id
      ? resultRows<BaseRow>(
          await tx.execute(
            sql`SELECT id,code,slug,name,type,capacity_total,description,published,operational_status,image_url FROM accommodation_units WHERE tenant_id=${actor.tenantId} AND id=${id} FOR UPDATE`,
          ),
        )[0]
      : undefined;
    if (id && !previous) throw new Error('El alojamiento no está disponible.');
    const previousBands = id
      ? resultRows<BandRow>(
          await tx.execute(
            sql`SELECT unit_id,min_guests,max_guests,amount_cents::text FROM base_rates WHERE tenant_id=${actor.tenantId} AND unit_id=${id}`,
          ),
        ).map((r) => ({
          minGuests: r.min_guests,
          maxGuests: r.max_guests,
          amountCents: r.amount_cents,
        }))
      : [];
    const old = previous
      ? {
          code: previous.code,
          slug: previous.slug,
          name: previous.name,
          type: previous.type,
          capacityTotal: previous.capacity_total,
          description: previous.description,
          published: previous.published,
          operationalStatus: previous.operational_status,
          imageUrl: previous.image_url ?? '',
          bands: previousBands,
        }
      : {};
    const data = inputSchema.parse({ ...old, ...inputSchema.partial().parse(raw) });
    const bands = validateRateBands(data.capacityTotal, data.bands);
    const unitId = id ?? randomUUID();
    if (id) {
      const occupied = resultRows<{ n: number }>(
        await tx.execute(
          sql`SELECT count(*)::int AS n FROM reservations WHERE tenant_id=${actor.tenantId} AND unit_id=${id} AND status IN ('PENDING_CONFIRMATION','CONFIRMED','IN_STAY') AND adults+cardinality(child_ages) > ${data.capacityTotal}`,
        ),
      );
      if (occupied[0].n)
        throw new Error('La capacidad es inferior a la ocupación de reservas existentes.');
      await tx.execute(
        sql`UPDATE accommodation_units SET code=${data.code},slug=${data.slug},name=${data.name},type=${data.type},capacity_total=${data.capacityTotal},description=${data.description},published=${data.published},operational_status=${data.operationalStatus},image_url=${data.imageUrl || null},updated_at=now() WHERE tenant_id=${actor.tenantId} AND id=${id}`,
      );
    } else {
      await tx.execute(
        sql`INSERT INTO accommodation_units(id,tenant_id,code,slug,name,type,capacity_total,description,published,operational_status,image_url) VALUES(${unitId},${actor.tenantId},${data.code},${data.slug},${data.name},${data.type},${data.capacityTotal},${data.description},${data.published},${data.operationalStatus},${data.imageUrl || null})`,
      );
      await tx.execute(
        sql`INSERT INTO housekeeping_status(tenant_id,unit_id,status) VALUES(${actor.tenantId},${unitId},'READY')`,
      );
    }
    await tx.execute(
      sql`DELETE FROM base_rates WHERE tenant_id=${actor.tenantId} AND unit_id=${unitId}`,
    );
    for (const r of bands)
      await tx.execute(
        sql`INSERT INTO base_rates(tenant_id,unit_id,min_guests,max_guests,amount_cents) VALUES(${actor.tenantId},${unitId},${r.minGuests},${r.maxGuests},${r.amountCents})`,
      );
    await appendAuditEvent(tx, {
      ...ctx,
      entity: 'accommodation',
      entityId: unitId,
      action: id ? 'ACCOMMODATION_UPDATED' : 'ACCOMMODATION_CREATED',
      correlationId: randomUUID(),
    });
    return { id: unitId };
  });
}
