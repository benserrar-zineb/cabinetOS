import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { GlobalExceptionFilter } from './modules/shared/filters/http-exception.filter';
// IMPORTANT : express et better-auth/node doivent etre importes APRES AppModule.
// Importes avant, ils provoquent un blocage silencieux au chargement d AppModule
// (conflit d ordre de chargement de modules constate empiriquement, TASK-013).
import * as express from 'express';
import { toNodeHandler } from 'better-auth/node';
import { auth } from './modules/identity/infrastructure/auth';

async function bootstrap() {
  // bodyParser desactive globalement : Better-Auth a besoin du flux brut de la requete
  // (il fait son propre parsing interne). Reapplique manuellement ci-dessous, en excluant
  // explicitement les routes /api/v1/auth/*.
  const app = await NestFactory.create(AppModule, { bodyParser: false });

  const expressApp = app.getHttpAdapter().getInstance();
  expressApp.all('/api/v1/auth/{*splat}', toNodeHandler(auth));

  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  app.setGlobalPrefix('api/v1', { exclude: ['api/v1/auth/{*splat}'] });
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.useGlobalFilters(new GlobalExceptionFilter());

  const config = new DocumentBuilder()
    .setTitle('CabinetOS API')
    .setDescription('Socle BUILD-001 - Core Platform Foundation')
    .setVersion('0.1.0')
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  await app.listen(3000);
}
bootstrap();
