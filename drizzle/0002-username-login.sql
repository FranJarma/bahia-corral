-- Login administrativo con nombre de usuario, sin modificar las credenciales existentes.
-- Se admite NULL para cuentas previas pendientes de completar su nombre de usuario.
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS username text;
CREATE UNIQUE INDEX IF NOT EXISTS user_username_unique ON "user" (username);
