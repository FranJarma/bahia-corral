import { describe, expect, it } from 'vitest';

import { quoteStay, stayDates } from '@/modules/pricing/domain/pricing-engine';

const base = [
  { minGuests:1,maxGuests:4,amountCents:14000000n },
  { minGuests:5,maxGuests:6,amountCents:18000000n },
  { minGuests:7,maxGuests:8,amountCents:20000000n },
];
const input = { unitId:'cabana-1',checkin:'2027-01-10',checkout:'2027-01-12',adults:2,childAges:[3,5],capacityTotal:8,depositPercentage:50,baseRates:base,datedRates:[] };
describe('Pricing Engine',()=>{
  it('calcula por noche; menor de 4 cuenta en capacidad pero no en tarifa',()=>{
    const quote=quoteStay(input);
    expect(quote.capacityUsed).toBe(4);
    expect(quote.payingGuests).toBe(3);
    expect(quote.nights).toHaveLength(2);
    expect(quote.totalCents).toBe(28000000n);
    expect(quote.depositCents).toBe(14000000n);
  });
  it('cambia precio únicamente las noches de una tarifa especial y conserva el resto',()=>{
    const q=quoteStay({...input, checkout:'2027-01-14',datedRates:[{minGuests:1,maxGuests:4,validFrom:'2027-01-12',validTo:'2027-01-14',amountCents:18000000n}]});
    expect(q.nights.map(x=>x.amountCents)).toEqual([14000000n,14000000n,18000000n,18000000n]);
    expect(q.totalCents).toBe(64000000n);
  });
  it('rechaza superar capacidad contando menores de 4',()=>{
    expect(()=>quoteStay({...input,adults:7,childAges:[2,3]})).toThrow('capacidad');
  });
  it('permite una sola persona con el tramo base mínimo',()=>{
    expect(quoteStay({...input,adults:1,childAges:[]}).totalCents).toBe(28000000n);
  });
  it('detecta tarifas contradictorias y sin cobertura',()=>{
    expect(()=>quoteStay({...input,baseRates:[]})).toThrow('tarifa base');
    expect(()=>quoteStay({...input,datedRates:[
      {minGuests:1,maxGuests:4,validFrom:'2027-01-01',validTo:'2027-01-20',amountCents:14000000n},
      {minGuests:1,maxGuests:4,validFrom:'2027-01-10',validTo:'2027-01-15',amountCents:12000000n},
    ]})).toThrow('superpuestas');
  });
  it('rechaza checkout igual a checkin y fecha inexistente',()=>{
    expect(()=>stayDates('2027-01-10','2027-01-10')).toThrow('estadía');
    expect(()=>stayDates('2027-02-30','2027-03-01')).toThrow('Fecha');
  });
});
