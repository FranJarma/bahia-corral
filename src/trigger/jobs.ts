import {task} from '@trigger.dev/sdk';

import {executeOutboxJob} from '@/infrastructure/jobs/outbox';

export const bahiaJobDispatch=task({
  id:'bahia-job-dispatch',
  run:async(payload:{jobId:string;tenantId:string})=>{
    await executeOutboxJob(payload.jobId,payload.tenantId);
  },
});
