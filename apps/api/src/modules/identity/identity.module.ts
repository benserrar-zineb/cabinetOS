import { Module } from '@nestjs/common';
import { IdentityController } from './presentation/identity.controller';

@Module({
  controllers: [IdentityController],
})
export class IdentityModule {}
