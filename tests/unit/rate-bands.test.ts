import { describe, expect, it } from 'vitest';
import { centsToPesos, pesosToCents, validateRateBands } from '@/modules/pricing/domain/rate-bands';
describe('Tarifas administradas por alojamiento',()=>{
  it('ordena tramos completos que cubren la capacidad',()=>{
    expect(validateRateBands(4,[{minGuests:3,maxGuests:4,amountCents:'120000'},{minGuests:1,maxGuests:2,amountCents:'100000'}]).map(b=>b.minGuests)).toEqual([1,3]);
  });
  it.each([
    [{minGuests:2,maxGuests:4,amountCents:'100'}],
    [{minGuests:1,maxGuests:2,amountCents:'100'}],
    [{minGuests:1,maxGuests:3,amountCents:'100'},{minGuests:3,maxGuests:4,amountCents:'100'}],
    [{minGuests:1,maxGuests:5,amountCents:'100'}],
    [{minGuests:1,maxGuests:4,amountCents:'0'}],
    [{minGuests:1,maxGuests:4,amountCents:'9223372036854775808'}],
  ])('rechaza huecos, solapamientos e importes inválidos (%j)',(...bands)=>{
    expect(()=>validateRateBands(4,bands)).toThrow();
  });
  it('convierte pesos y centavos con precisión decimal',()=>{
    expect(pesosToCents('123456789012345.67')).toBe('12345678901234567');
    expect(pesosToCents('0,10')).toBe('10');
    expect(centsToPesos('125050')).toBe('1250.50');
  });
  it.each(['-1','abc','1.999','1e3'])('rechaza el importe %s',value=>{
    expect(()=>pesosToCents(value)).toThrow();
  });
});
