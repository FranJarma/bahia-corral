import {NextResponse,type NextRequest} from 'next/server';
import {z} from 'zod';

import {assertTrustedOrigin,failResponse,jsonInput,successJson} from '@/infrastructure/http/route';
import {getAdminActor} from '@/modules/identity-access/application/admin-actor';
import {requirePermission} from '@/modules/identity-access/domain/permissions';
import {confirmReservation} from '@/modules/reservations/application/confirm-reservation';
import {modifyReservation} from '@/modules/reservations/application/modify-reservation';
import {transitionReservation} from '@/modules/reservations/application/transition-reservation';

const command=z.discriminatedUnion('action',[
  z.object({action:z.literal('confirm-exception'),reason:z.string().trim().min(3)}),
  z.object({action:z.literal('checkin')}),
  z.object({action:z.literal('checkout')}),
  z.object({action:z.literal('cancel'),reason:z.string().min(3)}),
  z.object({action:z.literal('no-show'),reason:z.string().min(3)}),
  z.object({action:z.literal('modify'),unitId:z.string().uuid(),checkin:z.string(),checkout:z.string(),adults:z.number().int().min(1),childAges:z.array(z.number().int().min(0).max(17)),reason:z.string().min(3)}),
]);
export async function PATCH(request:NextRequest,{params}:{params:Promise<{id:string}>}){try{
  assertTrustedOrigin(request);const actor=await getAdminActor();if(!actor)return NextResponse.json({error:'No autorizado'},{status:401});
  requirePermission(actor.role,'reservations:write');const {id}=await params;const body=await jsonInput(request,command);
  const ctx={tenantId:actor.tenantId,actorId:actor.userId,actorType:'USER' as const};
  switch(body.action){
    case'confirm-exception':await confirmReservation(ctx,{reservationId:id,exceptional:{reason:body.reason,role:actor.role}});break;
    case'checkin':await transitionReservation(ctx,id,'IN_STAY');break;
    case'checkout':await transitionReservation(ctx,id,'COMPLETED');break;
    case'cancel':await transitionReservation(ctx,id,'CANCELLED',body.reason);break;
    case'no-show':await transitionReservation(ctx,id,'NO_SHOW',body.reason);break;
    case'modify':await modifyReservation(ctx,{reservationId:id,...body});break;
  }
  return successJson({updated:true});
}catch(error){return failResponse(error);}}
