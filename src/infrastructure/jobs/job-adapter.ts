import 'server-only';

export type JobIntent={jobId:string;kind:string;tenantId:string;entityId:string;dueAt:Date;version:number};
export type JobAdapter={dispatch(job:JobIntent):Promise<{providerRunId:string}>};

/** Contrato del dominio: no expone nombres ni tipos específicos de Trigger.dev. */
export function createTriggerJobAdapter():JobAdapter{
  return {async dispatch(job){
    if(!process.env.TRIGGER_SECRET_KEY)throw new Error('Trigger.dev no está configurado');
    const response=await fetch('https://api.trigger.dev/api/v3/tasks/bahia-job-dispatch/trigger',{
      method:'POST',headers:{Authorization:`Bearer ${process.env.TRIGGER_SECRET_KEY}`,'Content-Type':'application/json'},
      body:JSON.stringify({payload:{jobId:job.jobId,tenantId:job.tenantId},options:{idempotencyKey:job.jobId}}),
      signal:AbortSignal.timeout(10_000),
    });
    if(!response.ok)throw new Error(`Trigger.dev rechazó tarea (${response.status})`);
    const body=await response.json() as {id?:string};
    if(!body.id)throw new Error('Trigger.dev no devolvió run id');
    return {providerRunId:body.id};
  }};
}
