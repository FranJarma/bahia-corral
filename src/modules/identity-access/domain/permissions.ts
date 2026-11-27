export type MembershipRole = 'OWNER' | 'STAFF' | 'CLEANING';
export type ActorRole = MembershipRole | 'PLATFORM_ADMIN';
export type Permission =
  | 'reservations:read'
  | 'reservations:write'
  | 'reservations:exception'
  | 'pricing:write'
  | 'payments:read'
  | 'payments:register'
  | 'refunds:request'
  | 'refunds:approve'
  | 'team:manage'
  | 'housekeeping:read'
  | 'housekeeping:write'
  | 'audit:operational'
  | 'audit:configuration'
  | 'accommodations:write'
  | 'events:manage';

const grants: Record<ActorRole, ReadonlySet<Permission>> = {
  PLATFORM_ADMIN: new Set<Permission>([
    'reservations:read',
    'reservations:write',
    'reservations:exception',
    'pricing:write',
    'payments:read',
    'payments:register',
    'refunds:request',
    'refunds:approve',
    'team:manage',
    'housekeeping:read',
    'housekeeping:write',
    'audit:operational',
    'audit:configuration',
    'accommodations:write',
    'events:manage',
  ]),
  OWNER: new Set<Permission>([
    'reservations:read',
    'reservations:write',
    'reservations:exception',
    'pricing:write',
    'payments:read',
    'payments:register',
    'refunds:request',
    'refunds:approve',
    'team:manage',
    'housekeeping:read',
    'housekeeping:write',
    'audit:operational',
    'audit:configuration',
    'accommodations:write',
    'events:manage',
  ]),
  STAFF: new Set<Permission>([
    'reservations:read',
    'reservations:write',
    'reservations:exception',
    'payments:read',
    'payments:register',
    'refunds:request',
    'housekeeping:read',
    'housekeeping:write',
    'audit:operational',
    'events:manage',
  ]),
  CLEANING: new Set<Permission>(['housekeeping:read', 'housekeeping:write']),
};

export function hasPermission(role: ActorRole, permission: Permission): boolean {
  return grants[role]?.has(permission) ?? false;
}
export function requirePermission(role: ActorRole, permission: Permission): void {
  if (!hasPermission(role, permission))
    throw new Error('No tenés permiso para realizar esta operación');
}
