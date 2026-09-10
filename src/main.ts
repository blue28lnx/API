import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, {
    logger: ['log', 'error', 'warn', 'debug'],
  });

  const config = app.get(ConfigService);
  const logger = new Logger('Bootstrap');

  // --- Helmet: cabeceras HTTP seguras por defecto ---
  // Para Swagger necesitamos permitir el recurso de la UI (CSS/JS inline)
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: [`'self'`],
          styleSrc: [`'self'`, `'unsafe-inline'`],
          scriptSrc: [`'self'`, `'unsafe-inline'`],
          imgSrc: [`'self'`, 'data:'],
        },
      },
    }),
  );

  // --- CORS explícito (no usamos app.enableCors() sin options) ---
  const origins = (config.get<string>('CORS_ORIGINS') ?? '')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);

  app.enableCors({
    origin: origins.length > 0 ? origins : false, // si no hay origins, no se permite
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  // --- Prefijo global /api ---
  app.setGlobalPrefix('api');

  // --- ValidationPipe global ---
  // whitelist: descarta props no declaradas en el DTO
  // forbidNonWhitelisted: lanza 400 si llegan props extra
  // transform: convierte payloads a instancias del DTO (tipado real)
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  // --- Filtro global de excepciones (formato uniforme) ---
  app.useGlobalFilters(new HttpExceptionFilter());

  // --- Swagger / OpenAPI ---
  // UI disponible en http://localhost:3000/api/docs
  const swaggerConfig = new DocumentBuilder()
    .setTitle('Shortcuts Trainer API')
    .setDescription(
      'API REST para gestión de atajos de teclado y sesiones de práctica. ' +
        'Autenticación con JWT doble token (access 15min + refresh 7d).',
    )
    .setVersion('1.0.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'JWT',
        description: 'Pegá el accessToken que recibiste en /auth/login',
        in: 'header',
      },
      'JWT-auth', // nombre del security scheme
    )
    .addTag('auth', 'Registro, login, refresh y logout')
    .addTag('shortcuts', 'CRUD de atajos del usuario logueado')
    .addTag('practice-sessions', 'Registro y listado de sesiones de práctica')
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, document, {
    swaggerOptions: { persistAuthorization: true },
    customSiteTitle: 'Shortcuts Trainer API Docs',
  });

  // --- Cierre limpio ---
  app.enableShutdownHooks();

  const port = Number(config.get<string>('PORT') ?? 3000);
  await app.listen(port);
  logger.log(`🚀 Shortcuts Trainer API corriendo en http://localhost:${port}/api`);
  logger.log(`📚 Swagger UI: http://localhost:${port}/api/docs`);
}

void bootstrap();
