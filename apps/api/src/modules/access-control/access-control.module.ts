import { Module } from '@nestjs/common';
import { AccessControlController } from './presentation/access-control.controller';

@Module({
  controllers: [AccessControlController],
})
export class AccessControlModule {}
