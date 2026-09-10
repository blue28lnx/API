import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';
import { CreateShortcutDto } from './dto/create-shortcut.dto';
import { UpdateShortcutDto } from './dto/update-shortcut.dto';

const COMBO_SEPARATOR = ',';

@Injectable()
export class ShortcutsService {
  constructor(private readonly prisma: PrismaService) {}

  // ---------- Helpers de (de)serialización ----------
  private serializeCombo(combo: string[]): string {
    return combo
      .map((k) => k.trim())
      .filter(Boolean)
      .join(COMBO_SEPARATOR);
  }

  private toApi(row: {
    id: string;
    action: string;
    tool: string;
    expectedCombo: string;
    category: string | null;
    userId: string;
    createdAt: Date;
    updatedAt: Date;
  }) {
    return {
      id: row.id,
      action: row.action,
      tool: row.tool,
      expectedCombo: row.expectedCombo.split(COMBO_SEPARATOR),
      category: row.category,
      userId: row.userId,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }

  // ---------- CRUD con ownership ----------

  /** Lista SOLO los shortcuts del usuario logueado. */
  async findAllByUser(userId: string, tool?: string) {
    const where: Prisma.ShortcutWhereInput = { userId };
    if (tool) where.tool = tool;

    const rows = await this.prisma.shortcut.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });
    return rows.map((r) => this.toApi(r));
  }

  async findOneOwned(userId: string, id: string) {
    const row = await this.prisma.shortcut.findFirst({ where: { id, userId } });
    if (!row) throw new NotFoundException('Shortcut no encontrado');
    return this.toApi(row);
  }

  async create(userId: string, dto: CreateShortcutDto) {
    const row = await this.prisma.shortcut.create({
      data: {
        userId,
        action: dto.action.trim(),
        tool: dto.tool.trim(),
        expectedCombo: this.serializeCombo(dto.expectedCombo),
        category: dto.category?.trim() ?? null,
      },
    });
    return this.toApi(row);
  }

  async update(userId: string, id: string, dto: UpdateShortcutDto) {
    // "Al menos un campo" lo controlamos acá (lógica de negocio, no validación de tipo)
    if (
      dto.action === undefined &&
      dto.tool === undefined &&
      dto.expectedCombo === undefined &&
      dto.category === undefined
    ) {
      throw new BadRequestException('Debe enviar al menos un campo a actualizar');
    }

    // Ownership: findFirst vs findUnique + chequeo de userId
    const existing = await this.prisma.shortcut.findFirst({ where: { id, userId } });
    if (!existing) throw new NotFoundException('Shortcut no encontrado');

    const data: Prisma.ShortcutUpdateInput = {};
    if (dto.action !== undefined) data.action = dto.action.trim();
    if (dto.tool !== undefined) data.tool = dto.tool.trim();
    if (dto.expectedCombo !== undefined) data.expectedCombo = this.serializeCombo(dto.expectedCombo);
    if (dto.category !== undefined) data.category = dto.category?.trim() ?? null;

    const updated = await this.prisma.shortcut.update({ where: { id }, data });
    return this.toApi(updated);
  }

  async remove(userId: string, id: string) {
    const existing = await this.prisma.shortcut.findFirst({
      where: { id, userId },
      select: { id: true },
    });
    if (!existing) throw new NotFoundException('Shortcut no encontrado');

    await this.prisma.shortcut.delete({ where: { id } });
    return { ok: true };
  }
}
