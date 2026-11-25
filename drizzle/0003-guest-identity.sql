-- Consolidación sin borrar huéspedes, reservas, pagos ni auditoría.
ALTER TABLE guests ADD COLUMN IF NOT EXISTS merged_into_id uuid;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='guests_merged_into_fk') THEN
    ALTER TABLE guests ADD CONSTRAINT guests_merged_into_fk
      FOREIGN KEY(tenant_id,merged_into_id) REFERENCES guests(tenant_id,id);
  END IF;
END $$;

DO $$
DECLARE current_tenant uuid;
BEGIN
  FOR current_tenant IN SELECT id FROM tenants LOOP
    PERFORM set_config('app.tenant_id',current_tenant::text,true);
    WITH ranked AS (
      SELECT id,first_value(id) OVER (
        PARTITION BY CASE WHEN NULLIF(btrim(email),'') IS NOT NULL
          THEN 'email:'||lower(btrim(email))
          ELSE 'contact:'||jsonb_build_array(
            regexp_replace(phone,'[^0-9]','','g'),
            lower(regexp_replace(btrim(first_name),'[[:space:]]+',' ','g')),
            lower(regexp_replace(btrim(last_name),'[[:space:]]+',' ','g')))::text END
        ORDER BY (user_id IS NOT NULL) DESC,created_at,id
      ) AS canonical_id
      FROM guests WHERE tenant_id=current_tenant AND merged_into_id IS NULL
    ), merged AS (
      UPDATE guests g SET merged_into_id=ranked.canonical_id
      FROM ranked WHERE g.tenant_id=current_tenant AND g.id=ranked.id AND ranked.id<>ranked.canonical_id
      RETURNING g.id,g.merged_into_id
    )
    INSERT INTO audit_events(tenant_id,actor_id,actor_type,entity,entity_id,action,changes,correlation_id)
      SELECT current_tenant,'migration-0003','SYSTEM','guest',id::text,'GUEST_CONSOLIDATED',
        jsonb_build_object('mergedIntoId',merged_into_id),'migration-0003:'||id::text FROM merged;
    UPDATE reservations r SET guest_id=g.merged_into_id,updated_at=now()
      FROM guests g WHERE r.tenant_id=current_tenant AND g.tenant_id=r.tenant_id
        AND r.guest_id=g.id AND g.merged_into_id IS NOT NULL;
  END LOOP;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS guests_email_identity
  ON guests(tenant_id,lower(btrim(email)))
  WHERE merged_into_id IS NULL AND NULLIF(btrim(email),'') IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS guests_contact_identity
  ON guests(tenant_id,regexp_replace(phone,'[^0-9]','','g'),
    lower(regexp_replace(btrim(first_name),'[[:space:]]+',' ','g')),
    lower(regexp_replace(btrim(last_name),'[[:space:]]+',' ','g')))
  WHERE merged_into_id IS NULL AND NULLIF(btrim(email),'') IS NULL;
