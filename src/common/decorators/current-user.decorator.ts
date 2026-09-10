import { createParamDecorator, ExecutionContext } from '@nestjs/common';

/**
 * Payload inyectado por JwtStrategy.validate()
 */
export interface JwtUserPayload {
  sub: string;        // userId
  email: string;
  iat?: number;
  exp?: number;
}

/**
 * @CurrentUser() -> { sub, email, ... }
 * Se usa en controllers para obtener el usuario autenticado
 * sin tocar el objeto Request.
 */
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): JwtUserPayload => {
    const request = ctx.switchToHttp().getRequest();
    return request.user as JwtUserPayload;
  },
);
