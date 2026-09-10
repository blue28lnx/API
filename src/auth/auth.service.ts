import {
  ConflictException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';

import { PrismaService } from '../prisma/prisma.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { AuthResponse, AuthTokens, PublicUser } from './types/auth.types';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  // ---------- Helpers públicos ----------

  async register(dto: RegisterDto): Promise<AuthResponse> {
    const email = dto.email.toLowerCase().trim();

    const exists = await this.prisma.user.findUnique({ where: { email } });
    if (exists) {
      throw new ConflictException('El email ya está registrado');
    }

    const cost = Number(this.config.get('BCRYPT_COST') ?? 12);
    const hashedPassword = await bcrypt.hash(dto.password, cost);

    const user = await this.prisma.user.create({
      data: { email, password: hashedPassword },
      select: { id: true, email: true, createdAt: true, updatedAt: true },
    });

    const tokens = await this.generateAndStoreTokens(user.id, user.email);
    return { user, ...tokens };
  }

  async login(dto: LoginDto): Promise<AuthResponse> {
    const email = dto.email.toLowerCase().trim();

    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) {
      // Mismo mensaje que password inválido para no filtrar qué campo está mal
      throw new UnauthorizedException('Credenciales inválidas');
    }

    const ok = await bcrypt.compare(dto.password, user.password);
    if (!ok) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    const tokens = await this.generateAndStoreTokens(user.id, user.email);
    return {
      user: this.toPublic(user),
      ...tokens,
    };
  }

  /**
   * Renueva el access token. Valida que el refresh token:
   *  1. Sea un JWT firmado por nosotros y no esté expirado (passport-refresh).
   *  2. El hash persistido en BD coincida con el del token entrante.
   *  3. Si todo OK, devolvemos un NUEVO access token (rotación recomendada en prod).
   */
  async refresh(userId: string, email: string, presentedToken: string): Promise<AuthTokens> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || !user.hashedRefreshToken) {
      throw new UnauthorizedException('Refresh token inválido');
    }

    const matches = await bcrypt.compare(presentedToken, user.hashedRefreshToken);
    if (!matches) {
      throw new UnauthorizedException('Refresh token inválido');
    }

    const accessToken = await this.signAccessToken(user.id, user.email);
    return { accessToken, refreshToken: presentedToken };
  }

  /**
   * Logout: invalidamos el refresh token persistido.
   * (El access token seguirá vigente hasta su expiración, ~15 min.)
   */
  async logout(userId: string): Promise<{ ok: true }> {
    await this.prisma.user.update({
      where: { id: userId },
      data: { hashedRefreshToken: null },
    });
    return { ok: true };
  }

  // ---------- Helpers internos ----------

  private async generateAndStoreTokens(userId: string, email: string): Promise<AuthTokens> {
    const accessToken = await this.signAccessToken(userId, email);
    const refreshToken = await this.signRefreshToken(userId, email);

    // Guardamos SOLO el hash del refresh token para poder revocarlo
    const hashedRefreshToken = await bcrypt.hash(refreshToken, 10);
    await this.prisma.user.update({
      where: { id: userId },
      data: { hashedRefreshToken },
    });

    return { accessToken, refreshToken };
  }

  private signAccessToken(userId: string, email: string): Promise<string> {
    return this.jwt.signAsync(
      { sub: userId, email },
      {
        secret: this.config.get<string>('JWT_ACCESS_SECRET'),
        expiresIn: (this.config.get<string>('JWT_ACCESS_TTL') ?? '15m') as any,
      },
    );
  }

  private signRefreshToken(userId: string, email: string): Promise<string> {
    return this.jwt.signAsync(
      { sub: userId, email },
      {
        secret: this.config.get<string>('JWT_REFRESH_SECRET'),
        expiresIn: (this.config.get<string>('JWT_REFRESH_TTL') ?? '7d') as any,
      },
    );
  }

  private toPublic(u: {
    id: string;
    email: string;
    createdAt: Date;
    updatedAt: Date;
  }): PublicUser {
    return { id: u.id, email: u.email, createdAt: u.createdAt, updatedAt: u.updatedAt };
  }
}
