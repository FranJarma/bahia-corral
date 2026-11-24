import type {NextRequest} from 'next/server';
import {z} from 'zod';

import {assertTrustedOrigin,failResponse,jsonInput,successJson} from '@/infrastructure/http/route';
import {requestReservationOtp} from '@/modules/guests/application/reservation-otp';

const input=z.object({reference:z.string().trim().min(4).max(50),email:z.email()});
export async function POST(request:NextRequest){
  try{assertTrustedOrigin(request);const data=await jsonInput(request,input);
    await requestReservationOtp(data.reference,data.email);
    return successJson({message:'Si los datos coinciden, enviamos un código a ese correo.'});
  }catch(error){return failResponse(error);}
}
