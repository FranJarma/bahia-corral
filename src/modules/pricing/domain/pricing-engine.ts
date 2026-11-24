export type RateBand = {
  minGuests: number;
  maxGuests: number;
  amountCents: bigint;
};
export type DatedRate = RateBand & {
  validFrom: string;
  validTo: string;
};
export type NightPrice = {
  date: string;
  amountCents: bigint;
  source: 'BASE' | 'DATED';
};
export type PriceQuote = {
  unitId: string;
  checkin: string;
  checkout: string;
  adults: number;
  childAges: number[];
  capacityUsed: number;
  payingGuests: number;
  nights: NightPrice[];
  totalCents: bigint;
  depositCents: bigint;
  currency: 'ARS';
};
export type QuoteInput = {
  unitId: string;
  checkin: string;
  checkout: string;
  adults: number;
  childAges: number[];
  capacityTotal: number;
  depositPercentage: number;
  baseRates: RateBand[];
  datedRates: DatedRate[];
};

function asUtcDate(date: string): Date {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error('Fecha inválida');
  const result = new Date(`${date}T00:00:00.000Z`);
  if (!Number.isFinite(result.valueOf()) || result.toISOString().slice(0, 10) !== date) {
    throw new Error('Fecha del calendario inválida');
  }
  return result;
}

export function stayDates(checkin: string, checkout: string): string[] {
  const first = asUtcDate(checkin);
  const last = asUtcDate(checkout);
  const length = (last.valueOf() - first.valueOf()) / 86_400_000;
  if (!Number.isInteger(length) || length < 1 || length > 365) {
    throw new Error('La estadía debe durar entre 1 y 365 noches');
  }
  return Array.from({ length }, (_, i) => new Date(first.valueOf() + i * 86_400_000).toISOString().slice(0, 10));
}

export function selectRate(guestCount: number, day: string, base: RateBand[], dated: DatedRate[]) {
  const matchingDated = dated.filter(r => r.minGuests <= guestCount && guestCount <= r.maxGuests && r.validFrom <= day && day < r.validTo);
  if (matchingDated.length > 1) throw new Error('Hay tarifas especiales superpuestas');
  if (matchingDated.length === 1) return { amountCents: matchingDated[0].amountCents, source: 'DATED' as const };
  const matchingBase = base.filter(r => r.minGuests <= guestCount && guestCount <= r.maxGuests);
  if (matchingBase.length !== 1) throw new Error('No hay una tarifa base única para esta ocupación');
  return { amountCents: matchingBase[0].amountCents, source: 'BASE' as const };
}

export function quoteStay(input: QuoteInput): PriceQuote {
  if (!Number.isInteger(input.adults) || input.adults < 1) throw new Error('Debe haber al menos un adulto');
  if (input.childAges.some(a => !Number.isInteger(a) || a < 0 || a >= 18)) throw new Error('Edad de menor inválida');
  if (!Number.isInteger(input.depositPercentage) || input.depositPercentage < 1 || input.depositPercentage > 100) {
    throw new Error('Porcentaje de seña inválido');
  }
  const capacityUsed = input.adults + input.childAges.length;
  if (capacityUsed > input.capacityTotal) throw new Error('Se supera la capacidad máxima del alojamiento');
  const payingGuests = input.adults + input.childAges.filter(a => a >= 4).length;
  const nights = stayDates(input.checkin, input.checkout).map(date => ({ date, ...selectRate(payingGuests, date, input.baseRates, input.datedRates) }));
  const totalCents = nights.reduce((sum,night) => sum + night.amountCents,0n);
  const depositCents = (totalCents * BigInt(input.depositPercentage) + 99n) / 100n;
  return { unitId:input.unitId,checkin:input.checkin,checkout:input.checkout,adults:input.adults,childAges:[...input.childAges],capacityUsed,payingGuests,nights,totalCents,depositCents,currency:'ARS' };
}

export function quoteToRecord(quote: PriceQuote) {
  return {
    ...quote, totalCents: quote.totalCents.toString(), depositCents:quote.depositCents.toString(),
    nights: quote.nights.map(n => ({...n, amountCents:n.amountCents.toString()})),
  };
}
