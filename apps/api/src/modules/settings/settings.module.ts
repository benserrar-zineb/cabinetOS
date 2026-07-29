import { Module } from '@nestjs/common';
import { SettingsController } from './presentation/settings.controller';

@Module({
  controllers: [SettingsController],
})
export class SettingsModule {}
