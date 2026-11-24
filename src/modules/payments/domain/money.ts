export function centsToMoney(cents:bigint):string {
  const positive=cents<0n?-cents:cents;
  const whole=positive/100n;
  const fraction=(positive%100n).toString().padStart(2,'0');
  return `${cents<0n?'-':''}${whole}.${fraction}`;
}
export function moneyToCents(value:string):bigint {
  if(!/^\d+(\.\d{1,2})?$/.test(value)) throw new Error('Monto decimal inválido');
  const [whole,fraction='']=value.split('.');
  return BigInt(whole)*100n+BigInt(fraction.padEnd(2,'0'));
}
export function outstanding(total:bigint,paid:bigint,refunded:bigint):bigint {
  return total-(paid-refunded);
}
export function cancellationRefund(deposit:bigint,paid:bigint,daysBefore:number):bigint {
  if(daysBefore<0)throw new Error('Fecha de cancelación inválida');
  const penalty=daysBefore>=7?0n:daysBefore>=3?(deposit+1n)/2n:deposit;
  return paid>penalty?paid-penalty:0n;
}
