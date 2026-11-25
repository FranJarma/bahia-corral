import { randomUUID } from 'node:crypto';
import { hashPassword } from 'better-auth/crypto';
import postgres from 'postgres';

async function main() {
  const url = new URL(process.env.DATABASE_MIGRATION_URL ?? '');
  if (!process.env.CI || process.env.E2E_TEST_DATABASE !== '1' ||
      !['localhost','127.0.0.1'].includes(url.hostname) || url.pathname !== '/bahia_e2e')
    throw new Error('Las cuentas de prueba sólo se crean en la base local y descartable de CI');
  const db = postgres(url.toString(), { max: 1, prepare: false });
  try {
    const [tenant] = await db`SELECT id FROM tenants WHERE slug='bahia-corral'`;
    const password = process.env.E2E_PASSWORD!;
    for (const role of ['OWNER','STAFF'] as const) {
      const id = randomUUID(), username = process.env.E2E_USERNAME! + (role === 'STAFF' ? '-staff' : '');
      const hash = await hashPassword(password);
      await db.begin(async tx => {
        await tx`SELECT set_config('app.tenant_id',${tenant.id},true)`;
        await tx`INSERT INTO "user"(id,name,username,email,email_verified) VALUES(${id},'Operador de prueba',${username},${username+'@example.com'},true)`;
        await tx`INSERT INTO account(id,account_id,provider_id,user_id,password) VALUES(${randomUUID()},${id},'credential',${id},${hash})`;
        await tx`INSERT INTO memberships(tenant_id,user_id,role) VALUES(${tenant.id},${id},${role})`;
      });
    }
  } finally { await db.end(); }
}
void main().catch(error => { console.error(error); process.exitCode = 1; });
