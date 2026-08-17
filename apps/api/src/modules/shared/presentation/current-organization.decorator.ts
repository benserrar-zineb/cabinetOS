import { createParamDecorator, ExecutionContext, ForbiddenException } from '@nestjs/common';
import type { Request } from 'express';

// TASK-025 (BUILD-002, module Patient) : ajout au Core Platform partage (meme
// emplacement que RequirePermission/Public), pas specifique au module Patient --
// tout futur module Business aura besoin de la meme extraction. PermissionsGuard lit
// deja x-organization-id pour verifier la permission ; ce decorateur relit la meme
// valeur pour la passer aux fonctions d acces (withOrganizationScope), sans dupliquer
// la logique de lecture d en-tete dans chaque controleur.
//
// Le controle de presence est un filet de securite (le Guard l a deja fait avant que
// le controleur ne s execute) -- jamais la premiere ligne de defense.

export const CurrentOrganizationId = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): string => {
    const request = ctx.switchToHttp().getRequest<Request>();
    const organizationId = request.headers['x-organization-id'];
    if (!organizationId || typeof organizationId !== 'string') {
      throw new ForbiddenException('Contexte d organisation (en-tete x-organization-id) requis.');
    }
    return organizationId;
  },
);
