import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';

import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { ShortcutsModule } from './shortcuts/shortcuts.module';
import { PracticeSessionsModule } from './practice-sessions/practice-sessions.module';

@Module({
  imports: [
    // Config global (.env)
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
    }),

    // Throttler: el primero es el global, los demás son los named throttlers
    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => [
        // Tier global
        {
          name: 'global',
          ttl: Number(config.get('THROTTLE_TTL') ?? 60) * 1000,
          limit: Number(config.get('THROTTLE_LIMIT') ?? 100),
        },
        // Tier estricto para /auth
        {
          name: 'auth',
          ttl: Number(config.get('AUTH_THROTTLE_TTL') ?? 60) * 1000,
          limit: Number(config.get('AUTH_THROTTLE_LIMIT') ?? 10),
        },
      ],
    }),

    PrismaModule,
    AuthModule,
    ShortcutsModule,
    PracticeSessionsModule,
  ],
  providers: [
    // Aplicamos el rate limit por defecto a TODA la app
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
