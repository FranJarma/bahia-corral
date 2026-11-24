import {NextResponse} from 'next/server';
import {sql} from 'drizzle-orm';
import {resultRows,runTenantTx} from '@/infrastructure/db/tenant-transaction';
import {failResponse,successJson} from '@/infrastructure/http/route';
import {getAdminActor} from '@/modules/identity-access/application/admin-actor';
import {requirePermission} from '@/modules/identity-access/domain/permissions';
export const dynamic='force-dynamic';
export async function GET(){try{const actor=await getAdminActor();if(!actor)return NextResponse.json({error:'No autorizado'},{status:401});requirePermission(actor.role,'reservations:read');
  const guests=await runTenantTx({tenantId:actor.tenantId,actorId:actor.userId,actorType:'USER'},async tx=>resultRows<{id:string;first_name:string;last_name:string;email:string|null;phone:string}>(await tx.execute(sql`
    SELECT id,first_name,last_name,email,phone FROM guests WHERE tenant_id=${actor.tenantId} ORDER BY created_at DESC LIMIT 200`)));
  return successJson({guests});
}catch(error){return failResponse(error);}}
