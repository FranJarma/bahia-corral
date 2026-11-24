import {NextResponse,type NextRequest} from 'next/server';
import {z} from 'zod';
import {createAdministrativeBlock} from '@/modules/availability/application/holds';
import {getAdminActor} from '@/modules/identity-access/application/admin-actor';
import {requirePermission} from '@/modules/identity-access/domain/permissions';
import {assertTrustedOrigin,failResponse,jsonInput,successJson} from '@/infrastructure/http/route';
export async function POST(request:NextRequest){try{
  assertTrustedOrigin(request);const actor=await getAdminActor();if(!actor)return NextResponse.json({error:'No autorizado'},{status:401});
  requirePermission(actor.role,'reservations:write');const data=await jsonInput(request,z.object({unitId:z.string().uuid(),checkin:z.string(),checkout:z.string(),reason:z.string().min(3)}));
  return successJson(await createAdministrativeBlock({tenantId:actor.tenantId,actorId:actor.userId,actorType:'USER'},data),201);
}catch(error){return failResponse(error);}}
