import {sql} from 'drizzle-orm';

import {getDefaultTenantId} from '@/infrastructure/db/get-tenant';
import {resultRows,runTenantTx,type TenantContext} from '@/infrastructure/db/tenant-transaction';
import {createTriggerJobAdapter,type JobAdapter} from '@/infrastructure/jobs/job-adapter';
import {sendMail} from '@/infrastructure/email/mail-port';

export async function dispatchOutbox(ctx:TenantContext,adapter:JobAdapter=createTriggerJobAdapter()){
  const jobs=await runTenantTx(ctx,async tx=>resultRows<{id:string;kind:string;entity_id:string;due_at:Date;version:number}>(await tx.execute(sql`
    SELECT id,kind,entity_id,due_at,version FROM outbox_jobs
    WHERE tenant_id=${ctx.tenantId} AND status IN ('PENDING','FAILED')
    AND due_at<=now()+interval '365 days' ORDER BY due_at LIMIT 50 FOR UPDATE SKIP LOCKED`)));
  let dispatched=0;
  for(const job of jobs){
    try{
      const result=await adapter.dispatch({jobId:job.id,kind:job.kind,tenantId:ctx.tenantId,entityId:job.entity_id,dueAt:new Date(job.due_at),version:job.version});
      await runTenantTx(ctx,async tx=>{await tx.execute(sql`UPDATE outbox_jobs SET status='DISPATCHED',provider_run_id=${result.providerRunId},attempts=attempts+1,last_error=NULL WHERE tenant_id=${ctx.tenantId} AND id=${job.id} AND status IN ('PENDING','FAILED')`);});
      dispatched++;
    }catch(error){
      await runTenantTx(ctx,async tx=>{await tx.execute(sql`UPDATE outbox_jobs SET status='FAILED',attempts=attempts+1,last_error=${error instanceof Error?error.message:'error'} WHERE tenant_id=${ctx.tenantId} AND id=${job.id}`);});
    }
  }
  return dispatched;
}

export async function executeOutboxJob(jobId:string,tenantId:string){
  const ctx={tenantId,actorId:'job-worker',actorType:'SYSTEM' as const};
  const job=await runTenantTx(ctx,async tx=>{
    const rows=resultRows<{id:string;kind:string;entity_id:string;status:string;due_at:Date}>(await tx.execute(sql`
      SELECT id,kind,entity_id,status,due_at FROM outbox_jobs WHERE tenant_id=${tenantId} AND id=${jobId} FOR UPDATE`));
    if(!rows[0]||rows[0].status==='DONE'||rows[0].status==='CANCELLED')return null;
    if(new Date(rows[0].due_at)>new Date())throw new Error('Tarea todavía no exigible');
    await tx.execute(sql`UPDATE outbox_jobs SET status='RUNNING' WHERE tenant_id=${tenantId} AND id=${jobId}`);
    return rows[0];
  });
  if(!job)return;
  try{
    if(job.kind.startsWith('BALANCE_REMINDER_')||job.kind==='RESERVATION_CONFIRMED'){
      const payload=await runTenantTx(ctx,async tx=>{
        const records=resultRows<{email:string|null;reference:string;status:string;checkin:string;amount_cents:string;paid_cents:string}>(await tx.execute(sql`
          SELECT g.email,r.reference,r.status,r.checkin::text,q.amount_cents::text,
          COALESCE((SELECT SUM(p.amount_cents) FROM payments p WHERE p.tenant_id=r.tenant_id AND p.reservation_id=r.id),0)::text AS paid_cents
          FROM reservations r JOIN guests g ON g.tenant_id=r.tenant_id AND g.id=r.guest_id
          JOIN stay_quotes q ON q.tenant_id=r.tenant_id AND q.id=r.quote_id
          WHERE r.tenant_id=${tenantId} AND r.id=${job.entity_id}`));
        return records[0]??null;
      });
      if(payload?.email&&['CONFIRMED','IN_STAY'].includes(payload.status)&&
        (job.kind==='RESERVATION_CONFIRMED'||BigInt(payload.amount_cents)>BigInt(payload.paid_cents))){
        const subject=job.kind==='RESERVATION_CONFIRMED'?'Tu reserva en Bahía Corral está confirmada':'Recordatorio de saldo pendiente — Bahía Corral';
        await sendMail({to:payload.email,subject,html:`<p>Reserva ${payload.reference}</p><p>Ingreso: ${payload.checkin}</p><p>Consultá tu reserva en nuestro sitio.</p>`,idempotencyKey:jobId});
      }
    }
    // Incidencias no producen envíos a huéspedes sin resolución administrativa.
    await runTenantTx(ctx,async tx=>{await tx.execute(sql`UPDATE outbox_jobs SET status='DONE',last_error=NULL WHERE tenant_id=${tenantId} AND id=${jobId}`);});
  }catch(error){
    await runTenantTx(ctx,async tx=>{await tx.execute(sql`UPDATE outbox_jobs SET status='FAILED',attempts=attempts+1,last_error=${error instanceof Error?error.message:'error'} WHERE tenant_id=${tenantId} AND id=${jobId}`);});
    throw error;
  }
}

export async function dispatchDefaultTenant(){
  const tenantId=await getDefaultTenantId();
  return dispatchOutbox({tenantId,actorId:'scheduler',actorType:'SYSTEM'});
}
