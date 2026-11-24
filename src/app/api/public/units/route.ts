import {NextResponse,type NextRequest} from 'next/server';
import {sql} from 'drizzle-orm';

import {getDefaultTenantId} from '@/infrastructure/db/get-tenant';
import {resultRows,runTenantTx} from '@/infrastructure/db/tenant-transaction';
import {failResponse} from '@/infrastructure/http/route';
export const dynamic='force-dynamic';
export async function GET(request:NextRequest){try{
  const slug=request.nextUrl.searchParams.get('slug');if(!slug)return NextResponse.json({error:'Falta alojamiento'},{status:400});
  const tenantId=await getDefaultTenantId();
  const units=await runTenantTx({tenantId,actorId:'public-unit',actorType:'SYSTEM'},async tx=>resultRows<{id:string;name:string;capacity_total:number}>(await tx.execute(sql`
    SELECT id,name,capacity_total FROM accommodation_units WHERE tenant_id=${tenantId} AND slug=${slug} AND published=true AND operational_status='ACTIVE' LIMIT 1`)));
  if(!units[0])return NextResponse.json({error:'No disponible'},{status:404});
  return NextResponse.json({unit:units[0]},{headers:{'Cache-Control':'no-store'}});
}catch(error){return failResponse(error);}}
