import { type NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { assertTrustedOrigin, failResponse, successJson } from '@/infrastructure/http/route';
import { getAdminActor } from '@/modules/identity-access/application/admin-actor';
import { listAdminUnits, saveAccommodation } from '@/modules/accommodations/application/manage-units';
export const dynamic='force-dynamic';
export async function GET() {
  try {
    const actor=await getAdminActor();
    if(!actor)return NextResponse.json({error:'No autorizado'},{status:401});
    return successJson({units:await listAdminUnits(actor)});
  }catch(error){return failResponse(error);}
}
async function save(request:NextRequest,editing:boolean) {
  try {
    assertTrustedOrigin(request);
    const actor=await getAdminActor();
    if(!actor)return NextResponse.json({error:'No autorizado'},{status:401});
    const body=await request.json();
    const id=editing?z.object({id:z.string().uuid()}).parse(body).id:undefined;
    const unit=await saveAccommodation(actor,body,id);
    return successJson({unit},editing?200:201);
  }catch(error){return failResponse(error);}
}
export async function POST(request:NextRequest){return save(request,false);}
export async function PATCH(request:NextRequest){return save(request,true);}
