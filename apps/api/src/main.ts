import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import * as express from 'express';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import type { EnvConfig } from './config/env.schema';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  const config = app.get(ConfigService<EnvConfig, true>);
  const logger = new Logger('Bootstrap');

  const apiPrefix = config.get('API_PREFIX', { infer: true });
  app.setGlobalPrefix(apiPrefix);

  app.use(helmet());
  app.use(compression());
  app.use(cookieParser());

  app.enableCors({
    origin: config.get('CORS_ORIGIN', { infer: true }),
    credentials: true,
  });

  app.useGlobalFilters(new AllExceptionsFilter());

  // Limite de payload — reafirma Prompt 5B §8; upload de arquivo nunca passa
  // pela API (docs/api/10-documents.md §10.1), então o limite JSON pode ser
  // conservador.
  app.use(express.json({ limit: '1mb' }));

  if (config.get('NODE_ENV', { infer: true }) !== 'production') {
    const swaggerConfig = new DocumentBuilder()
      .setTitle('Quilombo Dev API')
      .setDescription('Workspace Jurídico Inteligente — Fase 1 (docs/api/00-resumo.md)')
      .setVersion('1.0.0')
      .addBearerAuth()
      .build();
    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup(`${apiPrefix}/docs`, app, document);
  }

  app.enableShutdownHooks();

  const port = config.get('PORT', { infer: true });
  await app.listen(port);
  logger.log(`Quilombo Dev API ouvindo na porta ${port} (prefixo /${apiPrefix})`);
}

bootstrap();
