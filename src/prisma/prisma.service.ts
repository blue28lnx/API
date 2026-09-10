import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

/**
 * Servicio que envuelve PrismaClient.
 * - Se conecta al iniciar el módulo y desconecta al cerrarlo.
 * - Es global para que cualquier módulo lo inyecte sin reimportarlo.
 */
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
