import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { HealthController } from './presentation/health.controller';
import { envValidationSchema } from './config/env.validation';
import { DatabaseService } from './database/database.service';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validationSchema: envValidationSchema,
    }),
  ],
  controllers: [HealthController],
  providers: [DatabaseService],
  exports: [DatabaseService],
})
export class SharedModule {}
