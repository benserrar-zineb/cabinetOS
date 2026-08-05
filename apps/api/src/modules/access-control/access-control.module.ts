import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { AccessControlController } from './presentation/access-control.controller';
import { PermissionsGuard } from './presentation/permissions.guard';
import { IdentityModule } from '../identity';
import { SharedModule } from '../shared';

@Module({
  imports: [IdentityModule, SharedModule],
  controllers: [AccessControlController],
  providers: [{ provide: APP_GUARD, useClass: PermissionsGuard }],
})
export class AccessControlModule {}
