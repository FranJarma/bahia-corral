-- El checkout recupera exclusivamente el contacto aportado en ese intento.
-- Una coincidencia de correo con un huésped previo no revela su perfil.
ALTER TABLE reservation_holds ADD COLUMN IF NOT EXISTS contact_snapshot jsonb;
