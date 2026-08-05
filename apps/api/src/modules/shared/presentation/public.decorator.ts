import { SetMetadata } from '@nestjs/common';

// TASK-016 : marque explicitement un endpoint comme public (aucune permission
// requise, aucune session necessaire) -- ex. /health, /auth/*. Sans ce decorateur
// ni @RequirePermission(), PermissionsGuard refuse l acces par defaut.

export const IS_PUBLIC_KEY = 'isPublic';
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
