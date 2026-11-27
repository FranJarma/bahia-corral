export type RateBandInput = { minGuests: number; maxGuests: number; amountCents: string };
export function validateRateBands(capacity: number, bands: RateBandInput[]) {
  const ordered = [...bands].sort((a, b) => a.minGuests - b.minGuests);
  let expected = 1;
  for (const band of ordered) {
    if (
      !Number.isInteger(band.minGuests) ||
      !Number.isInteger(band.maxGuests) ||
      band.minGuests !== expected ||
      band.maxGuests < band.minGuests ||
      band.maxGuests > capacity ||
      !/^\d+$/.test(band.amountCents) ||
      BigInt(band.amountCents) <= 0n ||
      BigInt(band.amountCents) > 9223372036854775807n
    )
      throw new Error(
        'Las tarifas deben tener importes positivos y tramos completos, sin superponerse.',
      );
    expected = band.maxGuests + 1;
  }
  if (expected !== capacity + 1)
    throw new Error('Las tarifas deben cubrir toda la capacidad del alojamiento.');
  return ordered;
}
export function pesosToCents(value: string) {
  const normalized = value.trim().replace(',', '.');
  if (!/^\d+(\.\d{1,2})?$/.test(normalized))
    throw new Error('Ingresá un importe válido con hasta dos decimales.');
  const [whole, decimals = ''] = normalized.split('.');
  return (BigInt(whole) * 100n + BigInt(decimals.padEnd(2, '0'))).toString();
}
export function centsToPesos(value: string) {
  const n = BigInt(value);
  return String(n / 100n) + '.' + String(n % 100n).padStart(2, '0');
}
