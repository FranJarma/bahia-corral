export type ReservationStatus = 'PENDING_CONFIRMATION'|'CONFIRMED'|'IN_STAY'|'COMPLETED'|'CANCELLED'|'NOT_COMPLETED'|'NO_SHOW';
export type BalanceDuePolicy = 'AT_CHECKIN'|'BEFORE_24H';
const allowed:Record<ReservationStatus, readonly ReservationStatus[]>={
  PENDING_CONFIRMATION:['CONFIRMED','NOT_COMPLETED'],
  CONFIRMED:['IN_STAY','CANCELLED','NO_SHOW'],
  IN_STAY:['COMPLETED'],
  COMPLETED:[],CANCELLED:[],NOT_COMPLETED:[],NO_SHOW:[],
};
export function assertTransition(from:ReservationStatus,to:ReservationStatus):void {
  if(!allowed[from].includes(to)) throw new Error(`Transición inválida: ${from} → ${to}`);
}
export function balanceDueAt(checkin:string,policy:BalanceDuePolicy):string {
  const day=new Date(`${checkin}T15:00:00-03:00`);
  if(!Number.isFinite(day.valueOf()))throw new Error('Ingreso inválido');
  return new Date(day.valueOf()-(policy==='BEFORE_24H'?86_400_000:0)).toISOString();
}
export function isStayActive(status:ReservationStatus):boolean {return status==='CONFIRMED'||status==='IN_STAY';}
