import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { AUTH_PROVIDER } from '../../identity/application/auth-provider.port';
import type { AuthProvider } from '../../identity/application/auth-provider.port';
import { DatabaseService } from '../../shared/database/database.service';
import { hasPermission } from '../infrastructure/permission-check.queries';
import { IS_PUBLIC_KEY } from '../../shared/presentation/public.decorator';
import {
  PERMISSION_KEY,
  type RequiredPermission,
} from '../../shared/presentation/require-permission.decorator';

// TASK-016 : Guard global, fail-closed. Un endpoint SANS @Public() ni
// @RequirePermission() explicite est refuse par defaut -- l oubli d un
// decorateur ne peut jamais se traduire par un acces ouvert par erreur.
@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    @Inject(AUTH_PROVIDER) private readonly authProvider: AuthProvider,
    private readonly databaseService: DatabaseService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      return true;
    }

    const required = this.reflector.getAllAndOverride<RequiredPermission | undefined>(
      PERMISSION_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!required) {
      throw new ForbiddenException(
        'Endpoint sans @RequirePermission() ni @Public() explicite : acces refuse par defaut.',
      );
    }

    const request = context.switchToHttp().getRequest<Request>();
    const headers = new Headers();
    for (const [key, value] of Object.entries(request.headers)) {
      if (typeof value === 'string') headers.set(key, value);
    }

    const identity = await this.authProvider.verifySession(headers);
    if (!identity) {
      throw new UnauthorizedException('Session absente ou invalide.');
    }

    const organizationId = request.headers['x-organization-id'];
    if (!organizationId || typeof organizationId !== 'string') {
      throw new ForbiddenException('Contexte d organisation (en-tete x-organization-id) requis.');
    }

    const allowed = await hasPermission(
      this.databaseService,
      organizationId,
      identity.userId,
      required.action,
      required.resource,
    );

    if (!allowed) {
      throw new ForbiddenException(
        `Permission manquante : ${required.action} sur ${required.resource}.`,
      );
    }

    return true;
  }
}
