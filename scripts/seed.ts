import postgres from 'postgres';

import { PUBLIC_UNITS } from '../src/modules/accommodations/domain/seed-units';

async function main() {
  if (!process.env.DATABASE_MIGRATION_URL) throw new Error('DATABASE_MIGRATION_URL requerido');
  const db = postgres(process.env.DATABASE_MIGRATION_URL, { max: 1, prepare: false });
  try {
    const [tenant] = await db`INSERT INTO tenants(slug,name) VALUES('bahia-corral','Bahía Corral')
      ON CONFLICT(slug) DO UPDATE SET name=excluded.name RETURNING id`;
    // FORCE RLS exige contexto tenant también para el usuario propietario de las tablas.
    await db.begin(async (tx) => {
      await tx`SELECT set_config('app.tenant_id',${tenant.id},true)`;
      for (const unit of PUBLIC_UNITS) {
        const [row] = await tx`INSERT INTO accommodation_units
          (tenant_id,code,slug,name,type,capacity_total,description,published)
          VALUES(${tenant.id},${unit.code},${unit.slug},${unit.name},${unit.type},${unit.capacityTotal},${unit.description},true)
          ON CONFLICT(tenant_id,code) DO UPDATE SET name=excluded.name,capacity_total=excluded.capacity_total RETURNING id`;
        const amounts =
          unit.type === 'CABIN'
            ? [
                [1, 4, 14000000],
                [5, 6, 18000000],
                [7, 8, 20000000],
              ]
            : [[1, unit.capacityTotal, unit.type === 'STUDIO' ? 9500000 : 6000000]];
        await tx`DELETE FROM base_rates WHERE tenant_id=${tenant.id} AND unit_id=${row.id}`;
        for (const [min, max, amount] of amounts) {
          await tx`INSERT INTO base_rates(tenant_id,unit_id,min_guests,max_guests,amount_cents)
            VALUES(${tenant.id},${row.id},${min},${max},${amount})`;
        }
        await tx`INSERT INTO housekeeping_status(tenant_id,unit_id,status) VALUES(${tenant.id},${row.id},'READY')
          ON CONFLICT(tenant_id,unit_id) DO NOTHING`;
      }
    });
    console.info('Seis alojamientos y sus tarifas cargadas correctamente.');
  } finally {
    await db.end();
  }
}
void main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
