import type {NextRequest} from 'next/server';
import {z} from 'zod';

import {getDefaultTenantId} from '@/infrastructure/db/get-tenant';
import {assertTrustedOrigin,failResponse,jsonInput,successJson} from '@/infrastructure/http/route';
import {attachGuestToHold} from '@/modules/reservations/application/attach-guest';

const input=z.object({holdId:z.string().uuid(),checkoutToken:z.string().min(32).max(128),contact:z.object({firstName:z.string().trim().min(1).max(80),lastName:z.string().trim().min(1).max(80),phone:z.string().trim().min(6).max(30),email:z.email()})});
export async function POST(request:NextRequest){
  try{assertTrustedOrigin(request);const data=await jsonInput(request,input);const tenantId=await getDefaultTenantId();
    return successJson(await attachGuestToHold({tenantId,actorId:'public-checkout',actorType:'SYSTEM'},{...data,origin:'WEB'}),201);
  }catch(error){return failResponse(error);}
}
