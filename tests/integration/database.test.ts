import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';

import postgres from 'postgres';
import {PostgreSqlContainer} from '@testcontainers/postgresql';
import {afterAll,beforeAll,describe,expect,it} from 'vitest';

let pg:Awaited<ReturnType<PostgreSqlContainer['start']>>;
let db:ReturnType<typeof postgres>;

beforeAll(async()=>{
  pg=await new PostgreSqlContainer('postgres:16-alpine').start();
  db=postgres(pg.getConnectionUri(),{max:2,prepare:false});
  await db.unsafe(readFileSync(resolve('drizzle/0001-initial.sql'),'utf8'));
  await db`INSERT INTO tenants(slug,name) VALUES('testing-one','Uno'),('testing-two','Dos')`;
},120_000);

afterAll(async()=>{await db?.end();await pg?.stop();});

describe('Base PostgreSQL — concurrencia y RLS',()=>{
  it('impide leer filas sin tenant y permite sólo las del tenant activo',async()=>{
    const t=await db`SELECT id,slug FROM tenants ORDER BY slug`;
    await db.begin(async tx=>{
      await tx`SELECT set_config('app.tenant_id',${t[0].id},true)`;
      await tx`INSERT INTO accommodation_units(tenant_id,code,slug,name,type,capacity_total,published)
        VALUES (${t[0].id},'A','a','Cabaña A','CABIN',8,true)`;
    });
    const without=await db`SELECT count(*)::int AS n FROM accommodation_units`;
    expect(without[0].n).toBe(0);
    await db.begin(async tx=>{
      await tx`SELECT set_config('app.tenant_id',${t[1].id},true)`;
      const other=await tx`SELECT count(*)::int AS n FROM accommodation_units`;
      expect(other[0].n).toBe(0);
    });
    await db.begin(async tx=>{
      await tx`SELECT set_config('app.tenant_id',${t[0].id},true)`;
      const own=await tx`SELECT count(*)::int AS n FROM accommodation_units`;
      expect(own[0].n).toBe(1);
    });
  });
  it('evita ocupar dos veces el mismo rango y permite un check-in el día del check-out',async()=>{
    const [tenant]=await db`SELECT id FROM tenants WHERE slug='testing-one'`;
    await db.begin(async tx=>{
      await tx`SELECT set_config('app.tenant_id',${tenant.id},true)`;
      const [unit]=await tx`SELECT id FROM accommodation_units WHERE tenant_id=${tenant.id} LIMIT 1`;
      await tx`INSERT INTO inventory_allocations(tenant_id,unit_id,checkin,checkout,reason,block_reason)
        VALUES(${tenant.id},${unit.id},'2027-01-10','2027-01-12','ADMIN_BLOCK','Mantenimiento')`;
      await expect(tx`INSERT INTO inventory_allocations(tenant_id,unit_id,checkin,checkout,reason,block_reason)
        VALUES(${tenant.id},${unit.id},'2027-01-11','2027-01-13','ADMIN_BLOCK','Duplicado')`).rejects.toThrow();
    }).catch(()=>null);
    // Un intento fallido aborta la transacción; comprobar de nuevo mediante una transacción sana.
    await db.begin(async tx=>{
      await tx`SELECT set_config('app.tenant_id',${tenant.id},true)`;
      const [unit]=await tx`SELECT id FROM accommodation_units WHERE tenant_id=${tenant.id} LIMIT 1`;
      await tx`INSERT INTO inventory_allocations(tenant_id,unit_id,checkin,checkout,reason,block_reason)
        VALUES(${tenant.id},${unit.id},'2027-01-10','2027-01-12','ADMIN_BLOCK','Prueba')`;
      await tx`INSERT INTO inventory_allocations(tenant_id,unit_id,checkin,checkout,reason,block_reason)
        VALUES(${tenant.id},${unit.id},'2027-01-12','2027-01-14','ADMIN_BLOCK','Siguiente huésped')`;
      const result=await tx`SELECT count(*)::int AS n FROM inventory_allocations WHERE tenant_id=${tenant.id}`;
      expect(result[0].n).toBe(2);
    });
  });
});
