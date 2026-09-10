# Shortcuts Trainer API

API REST para gestionar atajos de teclado y sesiones de práctica de herramientas de desarrollo.
Backend del proyecto migrado desde Zustand/localStorage a NestJS + PostgreSQL + Prisma.

## Stack

- **NestJS 11** + TypeScript
- **Prisma ORM** + **PostgreSQL**
- **JWT doble token** (access 15min + refresh 7d, con hash en BD para revocación)
- **Passport** (`passport-jwt`)
- **Helmet**, **CORS** explícito
- **@nestjs/throttler** (rate limit global + reforzado en `/auth`)
- **class-validator** + `ValidationPipe` global (`whitelist`, `forbidNonWhitelisted`, `transform`)

## Setup con pnpm

```bash
# 1) Instalar dependencias
pnpm install

# 2) Variables de entorno
cp .env.example .env
# editar DATABASE_URL y los secrets JWT (mínimo 32 chars)

# 3) Generar cliente Prisma y migrar
pnpm prisma:generate
pnpm prisma:migrate

# 4) (opcional) cargar datos demo
pnpm seed

# 5) Levantar en dev
pnpm start:dev
```

API queda en: `http://localhost:3000/api`

## Endpoints

### Auth
| Método | Ruta             | Body / Headers                              | Respuesta              |
|--------|------------------|---------------------------------------------|------------------------|
| POST   | /auth/register   | `{ email, password }`                      | `{ user, accessToken, refreshToken }` |
| POST   | /auth/login      | `{ email, password }`                      | `{ user, accessToken, refreshToken }` |
| POST   | /auth/refresh    | `{ refreshToken }` (en body)                | `{ accessToken, refreshToken }` |
| POST   | /auth/logout     | `Authorization: Bearer <access>`            | `{ ok: true }` |
| GET    | /auth/me         | `Authorization: Bearer <access>`            | `{ sub, email }` |

### Shortcuts (todos requieren `Authorization: Bearer <access>`)
| Método | Ruta                    | Body                                              |
|--------|-------------------------|---------------------------------------------------|
| GET    | /shortcuts?tool=VSCode  | —                                                 |
| GET    | /shortcuts/:id          | —                                                 |
| POST   | /shortcuts              | `{ action, tool, expectedCombo: string[], category? }` |
| PATCH  | /shortcuts/:id          | `Partial<CreateShortcutDto>`                      |
| DELETE | /shortcuts/:id          | —                                                 |

> Ownership: cada usuario ve/modifica **solo** sus propios shortcuts (chequeo por `userId` en cada query).

### Practice Sessions
| Método | Ruta                                   | Body / Query                                   |
|--------|----------------------------------------|------------------------------------------------|
| POST   | /practice-sessions                     | `{ accuracy, timeSpentMs, mistakes, shortcutId?, notes? }` |
| GET    | /practice-sessions?limit=20&offset=0&shortcutId=... | — |
| GET    | /practice-sessions/:id                 | —                                              |

## Ejemplos curl

```bash
# Register
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"santi@test.com","password":"Santi1234"}'

# Login
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"santi@test.com","password":"Santi1234"}'

# Crear shortcut (con token)
curl -X POST http://localhost:3000/api/shortcuts \
  -H "Authorization: Bearer <ACCESS_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"action":"Toggle terminal","tool":"VS Code","expectedCombo":["Ctrl","`"]}'
```

## Decisiones de diseño

- **expectedCombo** se persiste como string (`"Ctrl,Shift,P"`) por compatibilidad cross-DB; en la API entra/sale como `string[]` (ver `ShortcutsService.serializeCombo` / `toApi`).
- **Refresh token**: el JWT crudo va al cliente, pero en BD solo guardamos su `bcrypt` hash → permite revocación inmediata via `logout`.
- **Access token** se verifica con la estrategia `jwt`. **Refresh** usa `jwt-refresh` que extrae el token del body y vuelve a chequear contra BD.
- **Rate limit**: `ThrottlerGuard` global (100 req/min) + capa `auth` (10 req/min) aplicada con `@Throttle()` en register/login/refresh.
- **Validación**: cualquier campo no declarado en el DTO se descarta (`whitelist`) y, si viene, devuelve 400 (`forbidNonWhitelisted`).
- **Errores**: `HttpExceptionFilter` global uniformiza el shape de respuesta.
