-- Reintegros de Mercado Pago: solicitudes, evidencia del proveedor e idempotencia.
ALTER TABLE refund_requests
  ADD COLUMN IF NOT EXISTS payment_id uuid,
  ADD COLUMN IF NOT EXISTS provider text,
  ADD COLUMN IF NOT EXISTS provider_order_id text,
  ADD COLUMN IF NOT EXISTS provider_refund_id text,
  ADD COLUMN IF NOT EXISTS idempotency_key uuid NOT NULL DEFAULT gen_random_uuid(),
  ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'ADMIN',
  ADD COLUMN IF NOT EXISTS provider_refunds_before jsonb,
  ADD COLUMN IF NOT EXISTS submitted_at timestamptz,
  ADD COLUMN IF NOT EXISTS checked_at timestamptz,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS last_error text,
  ADD COLUMN IF NOT EXISTS decision_reason text;

ALTER TABLE refund_requests DROP CONSTRAINT IF EXISTS refund_requests_status_check;
ALTER TABLE refund_requests ADD CONSTRAINT refund_requests_status_check
  CHECK (status IN ('REQUESTED','APPROVED','PROCESSING','UNCERTAIN','REJECTED','EXECUTED','FAILED'));
ALTER TABLE refund_requests DROP CONSTRAINT IF EXISTS refund_requests_source_check;
ALTER TABLE refund_requests ADD CONSTRAINT refund_requests_source_check CHECK (source IN ('ADMIN','PROVIDER'));
ALTER TABLE refund_requests DROP CONSTRAINT IF EXISTS refund_requests_linked_payment_check;
ALTER TABLE refund_requests ADD CONSTRAINT refund_requests_linked_payment_check
  CHECK (payment_id IS NULL OR (amount_cents > 0 AND provider = 'MERCADO_PAGO' AND provider_order_id IS NOT NULL));
ALTER TABLE refund_requests DROP CONSTRAINT IF EXISTS refund_requests_snapshot_check;
ALTER TABLE refund_requests ADD CONSTRAINT refund_requests_snapshot_check
  CHECK (provider_refunds_before IS NULL OR jsonb_typeof(provider_refunds_before) = 'array');

CREATE UNIQUE INDEX IF NOT EXISTS payments_tenant_reservation_identity
  ON payments(tenant_id,reservation_id,id);
ALTER TABLE refund_requests DROP CONSTRAINT IF EXISTS refund_requests_payment_reservation_fk;
ALTER TABLE refund_requests ADD CONSTRAINT refund_requests_payment_reservation_fk
  FOREIGN KEY(tenant_id,reservation_id,payment_id) REFERENCES payments(tenant_id,reservation_id,id);

CREATE UNIQUE INDEX IF NOT EXISTS refund_requests_idempotency
  ON refund_requests(tenant_id,idempotency_key);
CREATE UNIQUE INDEX IF NOT EXISTS refund_requests_provider_identity
  ON refund_requests(tenant_id,provider_refund_id) WHERE provider_refund_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS refund_requests_one_open_per_payment
  ON refund_requests(tenant_id,payment_id)
  WHERE payment_id IS NOT NULL AND source='ADMIN' AND status IN ('REQUESTED','APPROVED','PROCESSING','UNCERTAIN');
CREATE INDEX IF NOT EXISTS refund_requests_reservation
  ON refund_requests(tenant_id,reservation_id);
