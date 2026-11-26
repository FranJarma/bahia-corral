import { randomUUID } from 'node:crypto';

import { hashPassword } from 'better-auth/crypto';
import postgres from 'postgres';

async function main() {
  const url = new URL(process.env.DATABASE_MIGRATION_URL ?? '');
  if (
    !process.env.CI ||
    process.env.E2E_TEST_DATABASE !== '1' ||
    !['localhost', '127.0.0.1'].includes(url.hostname) ||
    url.pathname !== '/bahia_e2e'
  )
    throw new Error('Las cuentas de prueba sólo se crean en la base local y descartable de CI');
  const db = postgres(url.toString(), { max: 1, prepare: false });
  try {
    const [tenant] = await db`SELECT id FROM tenants WHERE slug='bahia-corral'`;
    const password = process.env.E2E_PASSWORD!;
    for (const role of ['OWNER', 'STAFF'] as const) {
      const id = randomUUID(),
        username = process.env.E2E_USERNAME! + (role === 'STAFF' ? '_staff' : '');
      const hash = await hashPassword(password);
      await db.begin(async (tx) => {
        await tx`SELECT set_config('app.tenant_id',${tenant.id},true)`;
        await tx`INSERT INTO "user"(id,name,username,email,email_verified) VALUES(${id},'Operador de prueba',${username},${username + '@example.com'},true)`;
        await tx`INSERT INTO account(id,account_id,provider_id,user_id,password) VALUES(${randomUUID()},${id},'credential',${id},${hash})`;
        await tx`INSERT INTO memberships(tenant_id,user_id,role) VALUES(${tenant.id},${id},${role})`;
      });
    }
    await db.begin(async (tx) => {
      await tx`SELECT set_config('app.tenant_id',${tenant.id},true)`;
      const [unit] =
        await tx`SELECT id FROM accommodation_units WHERE tenant_id=${tenant.id} AND slug='cabana-1'`;
      for (const width of [1280, 390]) {
        const [guest] = await tx`INSERT INTO guests(tenant_id,first_name,last_name,email,phone)
          VALUES(${tenant.id},'Persona',${'Devolución ' + width},${'refund-' + width + '@example.com'},'3870000000') RETURNING id`;
        const [quote] =
          await tx`INSERT INTO stay_quotes(tenant_id,unit_id,checkin,checkout,adults,nights,amount_cents,deposit_cents,terms_version)
          VALUES(${tenant.id},${unit.id},'2031-01-10','2031-01-11',2,'[]',10000000,5000000,'e2e-refunds') RETURNING id`;
        const [reservation] =
          await tx`INSERT INTO reservations(tenant_id,reference,unit_id,guest_id,quote_id,checkin,checkout,adults,status,origin,balance_due_policy,terms_version)
          VALUES(${tenant.id},${'E2E-REFUND-' + width},${unit.id},${guest.id},${quote.id},'2031-01-10','2031-01-11',2,'CANCELLED','WEB','AT_CHECKIN','e2e-refunds') RETURNING id`;
        const [request] =
          await tx`INSERT INTO payment_requests(tenant_id,reservation_id,quote_id,amount_cents,purpose,provider_order_id,status)
          VALUES(${tenant.id},${reservation.id},${quote.id},10000000,'FULL',${'ORD_E2E_REFUND_' + width},'APPROVED') RETURNING id`;
        await tx`INSERT INTO payments(tenant_id,reservation_id,request_id,amount_cents,method,provider,channel,external_id)
          VALUES(${tenant.id},${reservation.id},${request.id},10000000,'CREDIT','MERCADO_PAGO','WEB',${'PAY_E2E_REFUND_' + width})`;
      }
    });
  } finally {
    await db.end();
  }
}
void main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
