import { SetMetadata } from '@nestjs/common';

// TASK-016 : declare la permission (action, resource) requise pour un endpoint.
// Sans ce decorateur (ni @Public()), PermissionsGuard refuse l acces par defaut
// (fail-closed) -- un endpoint protege doit explicitement dire ce qu il exige.

export const PERMISSION_KEY = 'requiredPermission';

export interface RequiredPermission {
  action: string;
  resource: string;
}

export const RequirePermission = (action: string, resource: string) =>
  SetMetadata(PERMISSION_KEY, { action, resource } satisfies RequiredPermission);
