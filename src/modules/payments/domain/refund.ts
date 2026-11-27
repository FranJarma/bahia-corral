export type RefundStatus =
  'REQUESTED' | 'APPROVED' | 'PROCESSING' | 'UNCERTAIN' | 'REJECTED' | 'EXECUTED' | 'FAILED';
export class RefundError extends Error {
  constructor(
    readonly code: 'NOT_FOUND' | 'INVALID_INPUT' | 'CONFLICT' | 'UNAVAILABLE',
    message: string,
  ) {
    super(message);
  }
}
