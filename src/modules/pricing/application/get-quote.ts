import { sql } from 'drizzle-orm';

import { getDefaultTenantId } from '@/infrastructure/db/get-tenant';
import { resultRows, runTenantTx } from '@/infrastructure/db/tenant-transaction';
import { quoteStay, type QuoteInput } from '@/modules/pricing/domain/pricing-engine';

type UnitRow = { id:string;capacity_total:number;deposit_percentage:number };
type RateRow = {min_guests:number;max_guests:number;amount_cents:string; valid_from?:string;valid_to?:string};

export async function getQuoteInput(unitId:string, checkin:string, checkout:string, adults:number, childAges:number[]):Promise<QuoteInput>{
  const tenantId=await getDefaultTenantId();
  return runTenantTx({tenantId,actorId:'public-price',actorType:'SYSTEM'},async tx=>{
    const units=resultRows<UnitRow>(await tx.execute(sql`
      SELECT u.id,u.capacity_total,t.deposit_percentage FROM accommodation_units u
      JOIN tenants t ON t.id=u.tenant_id
      WHERE u.tenant_id=${tenantId} AND u.id=${unitId} AND u.published=true AND u.operational_status='ACTIVE'
    `));
    if(!units[0])throw new Error('Alojamiento no disponible');
    const base=resultRows<RateRow>(await tx.execute(sql`SELECT min_guests,max_guests,amount_cents FROM base_rates WHERE tenant_id=${tenantId} AND unit_id=${unitId}`));
    const dated=resultRows<RateRow>(await tx.execute(sql`SELECT min_guests,max_guests,valid_from::text,valid_to::text,amount_cents FROM dated_rates WHERE tenant_id=${tenantId} AND unit_id=${unitId} AND valid_to > ${checkin}::date AND valid_from < ${checkout}::date`));
    return {unitId,checkin,checkout,adults,childAges,capacityTotal:units[0].capacity_total,depositPercentage:units[0].deposit_percentage,
      baseRates:base.map(r=>({minGuests:r.min_guests,maxGuests:r.max_guests,amountCents:BigInt(r.amount_cents)})),
      datedRates:dated.map(r=>({minGuests:r.min_guests,maxGuests:r.max_guests,amountCents:BigInt(r.amount_cents),validFrom:r.valid_from!,validTo:r.valid_to!})),
    };
  });
}

export async function calculateQuote(unitId:string,checkin:string,checkout:string,adults:number,childAges:number[]){
  return quoteStay(await getQuoteInput(unitId,checkin,checkout,adults,childAges));
}
