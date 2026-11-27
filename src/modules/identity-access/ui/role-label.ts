import type { ActorRole } from '@/modules/identity-access/domain/permissions';
export const ROLE_LABELS: Record<ActorRole, string> = {
  OWNER: 'Administrador',
  STAFF: 'Personal administrativo',
  CLEANING: 'Personal de limpieza',
  PLATFORM_ADMIN: 'Administrador de plataforma',
};
