import {NextResponse,type NextRequest} from 'next/server';
import {z} from 'zod';

import {getDefaultTenantId} from '@/infrastructure/db/get-tenant';
import {failResponse} from '@/infrastructure/http/route';
import {searchAvailability} from '@/modules/availability/application/search-availability';

export const dynamic='force-dynamic';
const params=z.object({checkin:z.string(),checkout:z.string(),guests:z.coerce.number().int().min(1).max(50)});
export async function GET(request:NextRequest){
  try{
    const {checkin,checkout,guests}=params.parse(Object.fromEntries(request.nextUrl.searchParams));
    const tenantId=await getDefaultTenantId();
    const units=await searchAvailability({tenantId,actorId:'public-search',actorType:'SYSTEM'},{checkin,checkout,guests});
    return NextResponse.json({units},{headers:{'Cache-Control':'no-store'}});
  }catch(error){return failResponse(error);}
}
