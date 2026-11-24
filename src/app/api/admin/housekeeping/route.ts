import {NextResponse,type NextRequest} from 'next/server';
import {z} from 'zod';
import {assertTrustedOrigin,failResponse,jsonInput,successJson} from '@/infrastructure/http/route';
import {listCleaning,updateCleaning} from '@/modules/housekeeping/application/housekeeping';
import {getAdminActor} from '@/modules/identity-access/application/admin-actor';
import {requirePermission} from '@/modules/identity-access/domain/permissions';

export const dynamic='force-dynamic';
export async function GET(){try{const actor=await getAdminActor();if(!actor)return NextResponse.json({error:'No autorizado'},{status:401});
  requirePermission(actor.role,'housekeeping:read');return successJson({units:await listCleaning({tenantId:actor.tenantId,actorId:actor.userId,actorType:'USER'})});
}catch(error){return failResponse(error);}}
export async function PATCH(request:NextRequest){try{assertTrustedOrigin(request);const actor=await getAdminActor();if(!actor)return NextResponse.json({error:'No autorizado'},{status:401});
  const body=await jsonInput(request,z.object({unitId:z.string().uuid(),status:z.enum(['PENDING','IN_PROGRESS','READY'])}));
  await updateCleaning({tenantId:actor.tenantId,actorId:actor.userId,actorType:'USER'},actor.role,body);
  return successJson({updated:true});
}catch(error){return failResponse(error);}}
