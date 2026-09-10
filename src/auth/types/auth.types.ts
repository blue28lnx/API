/**
 * Shape público del usuario (sin password ni hash).
 * Es lo que devolvemos en login/register y se usa como tipo de retorno.
 */
export interface PublicUser {
  id: string;
  email: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface AuthResponse extends AuthTokens {
  user: PublicUser;
}
