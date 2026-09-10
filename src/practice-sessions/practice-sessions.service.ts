import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';
import { CreatePracticeSessionDto } from './dto/create-practice-session.dto';
import { QueryPracticeSessionsDto } from './dto/query-practice-sessions.dto';

@Injectable()
export class PracticeSessionsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Crea una PracticeSession para el usuario logueado.
   * Si viene shortcutId, valida que ese shortcut sea del MISMO usuario
   * (no se puede "sumar" práctica a un shortcut ajeno).
   */
  async create(userId: string, dto: CreatePracticeSessionDto) {
    if (dto.shortcutId) {
      const owns = await this.prisma.shortcut.findFirst({
        where: { id: dto.shortcutId, userId },
        select: { id: true },
      });
      if (!owns) {
        // 403: el recurso existe (o no), pero no es tuyo
        throw new ForbiddenException('El shortcut indicado no pertenece al usuario');
      }
    }

    return this.prisma.practiceSession.create({
      data: {
        userId,
        accuracy: dto.accuracy,
        timeSpentMs: dto.timeSpentMs,
        mistakes: dto.mistakes,
        shortcutId: dto.shortcutId ?? null,
      },
      include: {
        shortcut: { select: { id: true, action: true, tool: true } },
      },
    });
  }

  /**
   * Historial paginado del usuario logueado.
   * Por defecto ordenamos por createdAt desc.
   */
  async findAllForUser(userId: string, q: QueryPracticeSessionsDto) {
    const limit = q.limit ?? 20;
    const offset = q.offset ?? 0;

    const [rows, total] = await this.prisma.$transaction([
      this.prisma.practiceSession.findMany({
        where: {
          userId,
          ...(q.shortcutId ? { shortcutId: q.shortcutId } : {}),
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
        include: {
          shortcut: { select: { id: true, action: true, tool: true } },
        },
      }),
      this.prisma.practiceSession.count({
        where: {
          userId,
          ...(q.shortcutId ? { shortcutId: q.shortcutId } : {}),
        },
      }),
    ]);

    return {
      data: rows,
      meta: { total, limit, offset },
    };
  }

  async findOneOwned(userId: string, id: string) {
    const row = await this.prisma.practiceSession.findFirst({
      where: { id, userId },
      include: {
        shortcut: { select: { id: true, action: true, tool: true } },
      },
    });
    if (!row) throw new NotFoundException('Sesión no encontrada');
    return row;
  }
}
