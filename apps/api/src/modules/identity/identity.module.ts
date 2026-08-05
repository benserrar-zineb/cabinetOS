import { Module } from '@nestjs/common';
import { IdentityController } from './presentation/identity.controller';
import { AUTH_PROVIDER } from './application/auth-provider.port';
import { BetterAuthProviderAdapter } from './infrastructure/better-auth-provider.adapter';

@Module({
  controllers: [IdentityController],
  providers: [{ provide: AUTH_PROVIDER, useClass: BetterAuthProviderAdapter }],
  exports: [AUTH_PROVIDER],
})
export class IdentityModule {}
