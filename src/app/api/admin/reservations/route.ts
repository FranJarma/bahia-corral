import {NextResponse,type NextRequest} from 'next/server';
import {z} from 'zod';

import {getDefaultTenantId} from '@/infrastructure/db/get-tenant';
import {assertTrustedOrigin,failResponse,jsonInput,successJson} from '@/infrastructure/http/route';
import {startCheckout} from '@/modules/availability/application/holds';
import {getAdminActor} from '@/modules/identity-access/application/admin-actor';
import {requirePermission} from '@/modules/identity-access/domain/permissions';
import {attachGuestToHold} from '@/modules/reservations/application/attach-guest';
import {confirmReservation} from '@/modules/reservations/application/confirm-reservation';
import {listReservations} from '@/modules/reservations/application/list-reservations';

const input=z.object({unitId:z.string().uuid(),checkin:z.string(),checkout:z.string(),adults:z.number().int().min(1),childAges:z.array(z.number().int().min(0).max(17)),contact:z.object({firstName:z.string().min(1),lastName:z.string().min(1),phone:z.string().min(6),email:z.email().optional()}),confirmWithoutDeposit:z.boolean(),reason:z.string().optional()});
export const dynamic='force-dynamic';
export async function GET(){
  try{const actor=await getAdminActor();if(!actor)return NextResponse.json({error:'No autorizado'},{status:401});
    requirePermission(actor.role,'reservations:read');
    return successJson({reservations:await listReservations({tenantId:actor.tenantId,actorId:actor.userId,actorType:'USER'})});
  }catch(error){return failResponse(error);}
}
export async function POST(request:NextRequest){try{
  assertTrustedOrigin(request);const actor=await getAdminActor();if(!actor)return NextResponse.json({error:'No autorizado'},{status:401});
  requirePermission(actor.role,'reservations:write');const body=await jsonInput(request,input);
  const ctx={tenantId:actor.tenantId,actorId:actor.userId,actorType:'USER' as const};
  const hold=await startCheckout(ctx,{unitId:body.unitId,checkin:body.checkin,checkout:body.checkout,adults:body.adults,childAges:body.childAges});
  const reservation=await attachGuestToHold(ctx,{holdId:hold.holdId,checkoutToken:hold.checkoutToken,contact:body.contact,origin:'PHONE'});
  if(body.confirmWithoutDeposit){await confirmReservation(ctx,{reservationId:reservation.reservationId,exceptional:{reason:body.reason??'',role:actor.role}});}
  return successJson(reservation,201);
}catch(error){return failResponse(error);}}
