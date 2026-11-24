export type HoldStatus = 'ACTIVE'|'VERIFYING'|'UNCERTAIN'|'EXPIRED'|'CONVERTED'|'REJECTED';
export const HOLD_MINUTES = 10;
export const PAYMENT_VERIFICATION_MINUTES = 5;
export function holdExpiresAt(start:Date):Date {return new Date(start.getTime()+HOLD_MINUTES*60_000);}
export function verificationDeadline(start:Date):Date {return new Date(start.getTime()+(HOLD_MINUTES+PAYMENT_VERIFICATION_MINUTES)*60_000);}
export function shouldReleaseHold(hold:{status:HoldStatus;expiresAt:Date;paymentStartedAt:Date|null},now:Date):boolean {
  if(hold.status!=='ACTIVE')return false;
  return !hold.paymentStartedAt && now>=hold.expiresAt;
}
