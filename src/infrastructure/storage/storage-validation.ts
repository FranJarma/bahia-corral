export function checkFileSignature(data: Uint8Array, type: string) {
  const prefix = Buffer.from(data.subarray(0, 12));
  if (type === 'application/pdf') return prefix.subarray(0, 5).toString() === '%PDF-';
  if (type === 'image/png')
    return prefix.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  if (type === 'image/jpeg') return prefix[0] === 0xff && prefix[1] === 0xd8 && prefix[2] === 0xff;
  return false;
}
