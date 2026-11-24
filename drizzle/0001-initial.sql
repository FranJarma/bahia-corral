-- Bahía Corral: migración inicial. Usar el rol migrador, distinto del runtime.
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS btree_gist;

CREATE TABLE IF NOT EXISTS "user" (
  id text PRIMARY KEY, name text NOT NULL, email text NOT NULL UNIQUE,
  email_verified boolean NOT NULL DEFAULT false, image text,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS "session" (
  id text PRIMARY KEY, expires_at timestamptz NOT NULL, token text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
  ip_address text, user_agent text, user_id text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS session_user_id_idx ON "session"(user_id);
CREATE TABLE IF NOT EXISTS "account" (
  id text PRIMARY KEY, account_id text NOT NULL, provider_id text NOT NULL,
  user_id text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  access_token text, refresh_token text, id_token text, access_token_expires_at timestamptz,
  refresh_token_expires_at timestamptz, scope text, password text,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS account_user_id_idx ON "account"(user_id);
CREATE TABLE IF NOT EXISTS "verification" (
  id text PRIMARY KEY, identifier text NOT NULL, value text NOT NULL,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS tenants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), slug text NOT NULL UNIQUE, name text NOT NULL,
  deposit_percentage integer NOT NULL DEFAULT 50 CHECK (deposit_percentage BETWEEN 1 AND 100),
  balance_due_policy text NOT NULL DEFAULT 'AT_CHECKIN' CHECK (balance_due_policy IN ('AT_CHECKIN','BEFORE_24H')),
  timezone text NOT NULL DEFAULT 'America/Argentina/Salta', created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS platform_admins (
  user_id text PRIMARY KEY REFERENCES "user"(id) ON DELETE CASCADE, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS memberships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL REFERENCES tenants(id),
  user_id text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('OWNER','STAFF','CLEANING')), active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(tenant_id,user_id), UNIQUE(tenant_id,id)
);
CREATE TABLE IF NOT EXISTS team_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL REFERENCES tenants(id),
  email text NOT NULL, role text NOT NULL CHECK (role IN ('STAFF','CLEANING')),
  token_hash text NOT NULL UNIQUE, expires_at timestamptz NOT NULL, accepted_at timestamptz,
  invited_by text NOT NULL REFERENCES "user"(id), created_at timestamptz NOT NULL DEFAULT now(), UNIQUE(tenant_id,id)
);
CREATE TABLE IF NOT EXISTS accommodation_units (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL REFERENCES tenants(id),
  code text NOT NULL, slug text NOT NULL, name text NOT NULL,
  type text NOT NULL CHECK (type IN ('CABIN','STUDIO','ROOM')),
  capacity_total integer NOT NULL CHECK (capacity_total BETWEEN 1 AND 50),
  description text NOT NULL DEFAULT '', published boolean NOT NULL DEFAULT false,
  operational_status text NOT NULL DEFAULT 'ACTIVE' CHECK (operational_status IN ('ACTIVE','INACTIVE')),
  image_url text, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(tenant_id,code), UNIQUE(tenant_id,slug), UNIQUE(tenant_id,id)
);
CREATE TABLE IF NOT EXISTS base_rates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL REFERENCES tenants(id),
  unit_id uuid NOT NULL, min_guests integer NOT NULL, max_guests integer NOT NULL,
  amount_cents bigint NOT NULL CHECK (amount_cents >= 0), currency text NOT NULL DEFAULT 'ARS',
  CHECK(min_guests >= 1 AND max_guests >= min_guests),
  FOREIGN KEY(tenant_id,unit_id) REFERENCES accommodation_units(tenant_id,id) ON DELETE CASCADE,
  UNIQUE(tenant_id,id)
);
DO $$ BEGIN
 IF NOT EXISTS(SELECT 1 FROM pg_constraint WHERE conname='no_base_band_overlap') THEN
  ALTER TABLE base_rates ADD CONSTRAINT no_base_band_overlap
   EXCLUDE USING gist(tenant_id WITH =,unit_id WITH =,int4range(min_guests,max_guests+1,'[)') WITH &&);
 END IF;
END $$;
CREATE TABLE IF NOT EXISTS dated_rates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL REFERENCES tenants(id),
  unit_id uuid NOT NULL, min_guests integer NOT NULL, max_guests integer NOT NULL,
  valid_from date NOT NULL, valid_to date NOT NULL,
  amount_cents bigint NOT NULL CHECK (amount_cents>=0), currency text NOT NULL DEFAULT 'ARS',
  CHECK (min_guests >= 1 AND max_guests >= min_guests AND valid_to > valid_from),
  FOREIGN KEY(tenant_id,unit_id) REFERENCES accommodation_units(tenant_id,id) ON DELETE CASCADE,
  UNIQUE(tenant_id,id)
);
DO $$ BEGIN
 IF NOT EXISTS(SELECT 1 FROM pg_constraint WHERE conname='no_dated_rate_overlap') THEN
  ALTER TABLE dated_rates ADD CONSTRAINT no_dated_rate_overlap
   EXCLUDE USING gist(tenant_id WITH =,unit_id WITH =,
     int4range(min_guests,max_guests+1,'[)') WITH &&,
     daterange(valid_from,valid_to,'[)') WITH &&);
 END IF;
END $$;
CREATE TABLE IF NOT EXISTS guests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL REFERENCES tenants(id),
  first_name text NOT NULL, last_name text NOT NULL, email text, phone text NOT NULL,
  user_id text REFERENCES "user"(id), created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(tenant_id,id)
);
CREATE TABLE IF NOT EXISTS stay_quotes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL REFERENCES tenants(id),
  unit_id uuid NOT NULL, checkin date NOT NULL, checkout date NOT NULL,
  adults integer NOT NULL, child_ages integer[] NOT NULL DEFAULT '{}',
  nights jsonb NOT NULL, amount_cents bigint NOT NULL, deposit_cents bigint NOT NULL,
  currency text NOT NULL DEFAULT 'ARS', terms_version text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK(checkout > checkin AND adults >= 1 AND deposit_cents <= amount_cents),
  FOREIGN KEY(tenant_id,unit_id) REFERENCES accommodation_units(tenant_id,id),
  UNIQUE(tenant_id,id)
);
CREATE TABLE IF NOT EXISTS reservations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL REFERENCES tenants(id),
  reference text NOT NULL, unit_id uuid NOT NULL, guest_id uuid NOT NULL,
  quote_id uuid NOT NULL, checkin date NOT NULL, checkout date NOT NULL,
  adults integer NOT NULL, child_ages integer[] NOT NULL DEFAULT '{}',
  status text NOT NULL DEFAULT 'PENDING_CONFIRMATION' CHECK(status IN
    ('PENDING_CONFIRMATION','CONFIRMED','IN_STAY','COMPLETED','CANCELLED','NOT_COMPLETED','NO_SHOW')),
  origin text NOT NULL CHECK(origin IN ('WEB','PHONE','WHATSAPP','FRONT_DESK')),
  balance_due_policy text NOT NULL CHECK(balance_due_policy IN ('AT_CHECKIN','BEFORE_24H')),
  terms_version text NOT NULL, exceptional_confirmation boolean NOT NULL DEFAULT false,
  exceptional_reason text, checkin_actual timestamptz, checkout_actual timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK(checkout > checkin),
  FOREIGN KEY(tenant_id,unit_id) REFERENCES accommodation_units(tenant_id,id),
  FOREIGN KEY(tenant_id,guest_id) REFERENCES guests(tenant_id,id),
  FOREIGN KEY(tenant_id,quote_id) REFERENCES stay_quotes(tenant_id,id),
  UNIQUE(tenant_id,reference), UNIQUE(tenant_id,id)
);
CREATE TABLE IF NOT EXISTS reservation_holds (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL REFERENCES tenants(id),
  unit_id uuid NOT NULL, quote_id uuid NOT NULL, reservation_id uuid,
  expires_at timestamptz NOT NULL, verification_deadline timestamptz,
  payment_started_at timestamptz,
  checkout_token_hash text UNIQUE,
  status text NOT NULL DEFAULT 'ACTIVE' CHECK(status IN ('ACTIVE','VERIFYING','UNCERTAIN','EXPIRED','CONVERTED','REJECTED')),
  created_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY(tenant_id,unit_id) REFERENCES accommodation_units(tenant_id,id),
  FOREIGN KEY(tenant_id,quote_id) REFERENCES stay_quotes(tenant_id,id),
  FOREIGN KEY(tenant_id,reservation_id) REFERENCES reservations(tenant_id,id),
  UNIQUE(tenant_id,id)
);
CREATE TABLE IF NOT EXISTS inventory_allocations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL REFERENCES tenants(id),
  unit_id uuid NOT NULL, checkin date NOT NULL, checkout date NOT NULL,
  reason text NOT NULL CHECK(reason IN ('HOLD','RESERVATION','ADMIN_BLOCK')),
  hold_id uuid, reservation_id uuid, block_reason text,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK(checkout > checkin),
  FOREIGN KEY(tenant_id,unit_id) REFERENCES accommodation_units(tenant_id,id),
  FOREIGN KEY(tenant_id,hold_id) REFERENCES reservation_holds(tenant_id,id),
  FOREIGN KEY(tenant_id,reservation_id) REFERENCES reservations(tenant_id,id),
  UNIQUE(tenant_id,id)
);
DO $$ BEGIN
 IF NOT EXISTS(SELECT 1 FROM pg_constraint WHERE conname='no_inventory_overlap') THEN
  ALTER TABLE inventory_allocations ADD CONSTRAINT no_inventory_overlap
    EXCLUDE USING gist(tenant_id WITH =,unit_id WITH =,
      daterange(checkin,checkout,'[)') WITH &&) WHERE (active = true);
 END IF;
END $$;
CREATE TABLE IF NOT EXISTS reservation_revisions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL REFERENCES tenants(id),
  reservation_id uuid NOT NULL, previous_quote_id uuid NOT NULL, new_quote_id uuid NOT NULL,
  reason text NOT NULL, changed_by text NOT NULL, created_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY(tenant_id,reservation_id) REFERENCES reservations(tenant_id,id),
  UNIQUE(tenant_id,id)
);
CREATE TABLE IF NOT EXISTS payment_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL REFERENCES tenants(id),
  reservation_id uuid NOT NULL, quote_id uuid NOT NULL, amount_cents bigint NOT NULL CHECK(amount_cents>0),
  purpose text NOT NULL CHECK(purpose IN ('DEPOSIT','FULL','BALANCE')),
  provider text NOT NULL DEFAULT 'MERCADO_PAGO', provider_order_id text,
  checkout_url text, status text NOT NULL DEFAULT 'CREATED',
  created_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY(tenant_id,reservation_id) REFERENCES reservations(tenant_id,id),
  FOREIGN KEY(tenant_id,quote_id) REFERENCES stay_quotes(tenant_id,id),
  UNIQUE(tenant_id,id), UNIQUE(provider,provider_order_id)
);
CREATE TABLE IF NOT EXISTS payment_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL REFERENCES tenants(id),
  request_id uuid NOT NULL, provider_payment_id text, status text NOT NULL,
  raw_status text, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY(tenant_id,request_id) REFERENCES payment_requests(tenant_id,id),
  UNIQUE(tenant_id,id)
);
CREATE TABLE IF NOT EXISTS payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL REFERENCES tenants(id),
  reservation_id uuid NOT NULL, request_id uuid, amount_cents bigint NOT NULL CHECK(amount_cents>0),
  currency text NOT NULL DEFAULT 'ARS', method text NOT NULL,
  provider text NOT NULL, channel text NOT NULL CHECK(channel IN ('WEB','MANUAL')),
  external_id text, manual_idempotency_key text,
  verified_by text, verified_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY(tenant_id,reservation_id) REFERENCES reservations(tenant_id,id),
  FOREIGN KEY(tenant_id,request_id) REFERENCES payment_requests(tenant_id,id),
  UNIQUE(tenant_id,id), UNIQUE(provider,external_id), UNIQUE(tenant_id,manual_idempotency_key)
);
CREATE TABLE IF NOT EXISTS provider_events_inbox (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL REFERENCES tenants(id),
  provider text NOT NULL, resource_id text NOT NULL, event_id text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb, processed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(tenant_id,id), UNIQUE(provider,event_id)
);
CREATE TABLE IF NOT EXISTS media_assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL REFERENCES tenants(id),
  bucket text NOT NULL, object_key text NOT NULL, original_name text NOT NULL,
  content_type text NOT NULL, size_bytes bigint NOT NULL CHECK(size_bytes>=0),
  status text NOT NULL DEFAULT 'PENDING' CHECK(status IN ('PENDING','VALIDATED','REJECTED')),
  public boolean NOT NULL DEFAULT false, created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(tenant_id,id), UNIQUE(bucket,object_key)
);
CREATE TABLE IF NOT EXISTS payment_evidence (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL REFERENCES tenants(id),
  reservation_id uuid NOT NULL, asset_id uuid NOT NULL, notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY(tenant_id,reservation_id) REFERENCES reservations(tenant_id,id),
  FOREIGN KEY(tenant_id,asset_id) REFERENCES media_assets(tenant_id,id),
  UNIQUE(tenant_id,id)
);
CREATE TABLE IF NOT EXISTS refund_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL REFERENCES tenants(id),
  reservation_id uuid NOT NULL, amount_cents bigint NOT NULL CHECK(amount_cents>=0),
  reason text NOT NULL, status text NOT NULL DEFAULT 'REQUESTED' CHECK(status IN ('REQUESTED','APPROVED','REJECTED','EXECUTED')),
  requested_by text, approved_by text, executed_by text,
  executed_at timestamptz, created_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY(tenant_id,reservation_id) REFERENCES reservations(tenant_id,id),
  UNIQUE(tenant_id,id)
);
CREATE TABLE IF NOT EXISTS guest_otp_challenges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL REFERENCES tenants(id),
  reservation_id uuid NOT NULL, email text NOT NULL, code_hash text NOT NULL,
  expires_at timestamptz NOT NULL, attempts integer NOT NULL DEFAULT 0,
  consumed_at timestamptz, created_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY(tenant_id,reservation_id) REFERENCES reservations(tenant_id,id),
  UNIQUE(tenant_id,id)
);
CREATE TABLE IF NOT EXISTS guest_access_grants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL REFERENCES tenants(id),
  reservation_id uuid NOT NULL, token_hash text NOT NULL UNIQUE, expires_at timestamptz NOT NULL,
  revoked_at timestamptz, created_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY(tenant_id,reservation_id) REFERENCES reservations(tenant_id,id),
  UNIQUE(tenant_id,id)
);
CREATE TABLE IF NOT EXISTS outbox_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL REFERENCES tenants(id),
  kind text NOT NULL, entity_id text NOT NULL, payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  due_at timestamptz NOT NULL, version integer NOT NULL DEFAULT 1,
  status text NOT NULL DEFAULT 'PENDING' CHECK(status IN ('PENDING','DISPATCHED','RUNNING','DONE','FAILED','CANCELLED')),
  attempts integer NOT NULL DEFAULT 0, locked_at timestamptz,
  provider_run_id text, last_error text, created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(tenant_id,id)
);
CREATE INDEX IF NOT EXISTS outbox_due_idx ON outbox_jobs(due_at) WHERE status IN ('PENDING','FAILED');
CREATE TABLE IF NOT EXISTS notification_deliveries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL REFERENCES tenants(id),
  job_id uuid, reservation_id uuid, kind text NOT NULL, recipient text NOT NULL,
  provider_message_id text, status text NOT NULL DEFAULT 'PENDING',
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY(tenant_id,job_id) REFERENCES outbox_jobs(tenant_id,id),
  FOREIGN KEY(tenant_id,reservation_id) REFERENCES reservations(tenant_id,id),
  UNIQUE(tenant_id,id), UNIQUE(tenant_id,job_id)
);
CREATE TABLE IF NOT EXISTS housekeeping_status (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL REFERENCES tenants(id),
  unit_id uuid NOT NULL, status text NOT NULL DEFAULT 'READY' CHECK(status IN ('PENDING','IN_PROGRESS','READY')),
  updated_by text, updated_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY(tenant_id,unit_id) REFERENCES accommodation_units(tenant_id,id),
  UNIQUE(tenant_id,unit_id), UNIQUE(tenant_id,id)
);
CREATE TABLE IF NOT EXISTS event_inquiries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL REFERENCES tenants(id),
  contact_name text NOT NULL, email text NOT NULL, phone text NOT NULL,
  event_type text NOT NULL, preferred_date date, guests_count integer,
  notes text, status text NOT NULL DEFAULT 'NEW' CHECK(status IN ('NEW','CONTACTED','CLOSED')),
  created_at timestamptz NOT NULL DEFAULT now(), UNIQUE(tenant_id,id)
);
CREATE TABLE IF NOT EXISTS audit_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL REFERENCES tenants(id),
  actor_id text NOT NULL, actor_type text NOT NULL CHECK(actor_type IN ('USER','SYSTEM','PROVIDER')),
  entity text NOT NULL, entity_id text NOT NULL, action text NOT NULL,
  reason text, changes jsonb, correlation_id text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(), UNIQUE(tenant_id,id)
);

-- RLS en TODAS las tablas del tenant; FORCE RLS también limita al owner.
DO $$
DECLARE t text;
BEGIN
 FOREACH t IN ARRAY ARRAY[
   'memberships','team_invitations','accommodation_units','base_rates','dated_rates',
   'guests','stay_quotes','reservations','reservation_holds','inventory_allocations',
   'reservation_revisions','payment_requests','payment_attempts','payments',
   'provider_events_inbox','media_assets','payment_evidence','refund_requests',
   'guest_otp_challenges','guest_access_grants','outbox_jobs','notification_deliveries',
   'housekeeping_status','event_inquiries','audit_events'
 ] LOOP
  EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY',t);
  EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY',t);
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename=t AND policyname='tenant_isolation') THEN
   EXECUTE format('CREATE POLICY tenant_isolation ON %I USING (tenant_id = NULLIF(current_setting(''app.tenant_id'',true),'''')::uuid) WITH CHECK (tenant_id = NULLIF(current_setting(''app.tenant_id'',true),'''')::uuid)',t);
  END IF;
 END LOOP;
END $$;

-- El runtime nunca debe poder alterar la auditoría; establecer GRANTs mediante el rol migrador.
-- Sugerencia: REVOKE UPDATE, DELETE, TRUNCATE ON audit_events FROM bahia_runtime;
