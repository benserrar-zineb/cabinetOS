import { Module } from '@nestjs/common';
import { StorageController } from './presentation/storage.controller';

@Module({
  controllers: [StorageController],
})
export class StorageModule {}
