import {NextResponse,type NextRequest} from 'next/server';
import {z} from 'zod';

import {assertTrustedOrigin,failResponse,jsonInput,successJson} from '@/infrastructure/http/route';
import {getAdminActor} from '@/modules/identity-access/application/admin-actor';
import {registerManualPayment} from '@/modules/payments/application/register-manual-payment';

const input=z.object({reservationId:z.string().uuid(),amountCents:z.string().regex(/^\d+$/),method:z.enum(['TRANSFER','CASH','DEBIT','CREDIT']),idempotencyKey:z.string().uuid(),reference:z.string().max(200).optional()});
export async function POST(request:NextRequest){try{
  assertTrustedOrigin(request);const actor=await getAdminActor();if(!actor)return NextResponse.json({error:'No autorizado'},{status:401});const data=await jsonInput(request,input);
  return successJson(await registerManualPayment({tenantId:actor.tenantId,actorId:actor.userId,actorType:'USER'},actor.role,{...data,amountCents:BigInt(data.amountCents)}),201);
}catch(error){return failResponse(error);}}
