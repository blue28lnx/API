import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

/**
 * Estrategia usada por el endpoint /auth/refresh.
 * Extrae el refresh token del body (NO del header Authorization).
 */
@Injectable()
export class RefreshJwtStrategy extends PassportStrategy(Strategy, 'jwt-refresh') {
  constructor(config: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromBodyField('refreshToken'),
      ignoreExpiration: false,
      secretOrKey: config.get<string>('JWT_REFRESH_SECRET') as string,
      passReqToCallback: true,
    });
  }

  validate(req: any, payload: { sub: string; email: string }) {
    // Adjuntamos el token crudo para poder compararlo contra el hash en BD
    const refreshToken = req.body?.refreshToken as string;
    return { sub: payload.sub, email: payload.email, refreshToken };
  }
}
