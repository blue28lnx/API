# Shortcuts Trainer API

> Backend de **Shortcuts Trainer**: una app para practicar atajos de teclado de
> distintas herramientas (General, Chrome, VS Code, Windows). Empezó como un side
> project con Zustand + localStorage y migramos a una API REST con
> **NestJS + PostgreSQL + Prisma**.

---

## 1. ¿Qué hace esta API?

- Maneja **usuarios** con autenticación JWT (access + refresh).
- Expone un **catálogo global de shortcuts** (atajos) con nivel de dificultad.
- Registra **sesiones de práctica** por usuario: precisión, tiempo y errores.
- Sirve Swagger UI y OpenAPI JSON en `/api/docs`.

En una frase: el front consume esta API para mostrar atajos, registrar el
resultado de cada práctica y llevar el historial del usuario.

---

## 2. Stack

- **NestJS 11** + TypeScript
- **Prisma ORM** + **PostgreSQL**
- **JWT doble token**: access (15 min) + refresh (7 d, hasheado en BD para revocación)
- **Passport** (`passport-jwt`) con dos estrategias: `jwt` y `jwt-refresh`
- **Helmet** (cabeceras seguras) + **CORS** explícito
- **@nestjs/throttler**: rate limit global (100 req/min) + capa estricta en `/auth` (10 req/min)
- **class-validator** + `ValidationPipe` global con `whitelist`, `forbidNonWhitelisted` y `transform`
- **Swagger** (OpenAPI 3) servido en `/api/docs`

---

## 3. Quickstart (local)

Requisitos: **Node 20+**, **pnpm 10+**, **PostgreSQL** corriendo en `localhost:5432`.

```bash
# 1) Instalar dependencias
pnpm install

# 2) Variables de entorno
cp .env.example .env
# Editar DATABASE_URL y los secrets JWT (mínimo 32 chars cada uno)

# 3) Generar cliente Prisma y correr migraciones
pnpm prisma:generate
pnpm prisma:migrate        # crea la DB si no existe y aplica migraciones

# 4) Cargar el catálogo de 40 shortcuts
pnpm seed

# 5) Levantar la API en modo watch
pnpm start:dev
```

URLs útiles en local:
- API: <http://localhost:3000/api>
- Swagger UI: <http://localhost:3000/api/docs>

> Si querés un script one-shot para limpiar la tabla `shortcuts` (útil antes
> de una migración destructiva), hay `scripts/clear-shortcuts.cjs`. Y
> `scripts/verify-seed.cjs` muestra el estado actual del catálogo.

---

## 4. Variables de entorno

| Variable | Default | Qué hace |
|---|---|---|
| `NODE_ENV` | `development` | Solo informativo. |
| `PORT` | `3000` | Puerto del HTTP server. |
| `DATABASE_URL` | — | Conexión Postgres. Formato `postgresql://user:pass@host:port/db?schema=public`. |
| `JWT_ACCESS_SECRET` | — | Secret para firmar access tokens. **Mín. 32 chars**, distinto al refresh. |
| `JWT_REFRESH_SECRET` | — | Secret para firmar refresh tokens. **Mín. 32 chars**, distinto al access. |
| `JWT_ACCESS_TTL` | `15m` | Vida útil del access token. |
| `JWT_REFRESH_TTL` | `7d` | Vida útil del refresh token. |
| `CORS_ORIGINS` | `http://localhost:5173,http://localhost:3001` | Orígenes permitidos, separados por coma. |
| `BCRYPT_COST` | `12` | Rondas de bcrypt. Bajalo a 10 en dev si te molesta el lag. |
| `THROTTLE_TTL` | `60` | Segundos de la ventana global. |
| `THROTTLE_LIMIT` | `100` | Requests por ventana global. |
| `AUTH_THROTTLE_TTL` | `60` | Segundos de la ventana para `/auth`. |
| `AUTH_THROTTLE_LIMIT` | `10` | Requests por ventana en `/auth`. |

---

## 5. Modelo de datos

Hay 3 entidades y 1 enum. Todo vive en `prisma/schema.prisma`.

```
                ┌──────────┐         1    N        ┌────────────────────┐
                │   User   │─────────────────────▶│ PracticeSession    │
                │──────────│                       │────────────────────│
                │ id (PK)  │                       │ id (PK)            │
                │ email    │                       │ accuracy (0..1)    │
                │ password │                       │ timeSpentMs        │
                │ hashed   │                       │ mistakes           │
                │  refresh │                       │ userId (FK)        │
                │   token  │                       │ shortcutId (FK, ?) │
                └──────────┘                       │ createdAt          │
                                                   └─────────┬──────────┘
                                                             │ N
                                                             │
                                                             │ 1
                                                   ┌─────────▼──────────┐
                                                   │     Shortcut       │ ◀── catálogo global
                                                   │────────────────────│
                                                   │ id (PK)            │
                                                   │ action             │
                                                   │ tool               │
                                                   │ expectedCombo      │ ("Ctrl,Shift,P")
                                                   │ category?          │
                                                   │ level (Level)      │
                                                   │ createdAt/updatedAt│
                                                   └────────────────────┘
```

**Enum `Level`:** `BEGINNER`, `INTERMEDIATE`, `ADVANCED`, `EXPERT`. Default `BEGINNER`.

**Notas importantes:**

- `Shortcut` es **global**: no tiene `userId`. Todos los usuarios ven el mismo
  catálogo. Si querés atajos por usuario, hay que volver a agregar la FK.
- `expectedCombo` se guarda como `String` separado por comas (ej: `"Ctrl,Shift,P"`)
  pero la API lo expone como `string[]` — la serialización vive en
  `ShortcutsService.serializeCombo` / `toApi`.
- `User.hashedRefreshToken` guarda el **hash bcrypt** del refresh token activo.
  Esto permite revocar el refresh inmediatamente vía `logout`.
- `PracticeSession.shortcutId` apunta al catálogo global. Si borrás un shortcut,
  las sesiones quedan con `shortcutId = NULL` (gracias al `onDelete: SetNull`).

---

## 6. Estructura del proyecto

```
API/
├── prisma/
│   ├── schema.prisma                 # modelo de datos (User, Shortcut, PracticeSession, Level)
│   ├── seed.ts                       # carga el catálogo desde prisma/data/catalogo.json
│   ├── data/
│   │   └── catalogo.json             # 40 shortcuts: General / Chrome / VS Code / Windows
│   └── migrations/                   # una carpeta por migración, generadas por prisma
│
├── scripts/
│   ├── clear-shortcuts.cjs           # wipe de shortcuts (uso manual, no se commitea a CI)
│   ├── verify-seed.cjs               # dump de control para ver qué cargó el seed
│   └── postinstall-fix.cjs           # fix post-install (patches de dependencias)
│
├── src/
│   ├── main.ts                       # bootstrap: helmet, CORS, ValidationPipe, Swagger, /api prefix
│   ├── app.module.ts                 # composición: Config, Throttler, Prisma, Auth, Shortcuts, PS
│   │
│   ├── prisma/                       # wrapper @Injectable() del PrismaClient
│   │
│   ├── common/
│   │   ├── decorators/current-user.decorator.ts   # @CurrentUser() para req.user
│   │   └── filters/http-exception.filter.ts       # shape uniforme de errores
│   │
│   ├── auth/                         # register, login, refresh, logout, me
│   │   ├── auth.controller.ts
│   │   ├── auth.service.ts           # bcrypt + JWT sign + revocación por hash
│   │   ├── guards/                   # JwtAuthGuard, RefreshAuthGuard
│   │   ├── strategies/               # passport-jwt (access) + passport-jwt (refresh)
│   │   └── dto/                      # register, login, refresh
│   │
│   ├── shortcuts/                    # catálogo global de atajos
│   │   ├── shortcuts.controller.ts
│   │   ├── shortcuts.service.ts
│   │   └── dto/                      # create, update
│   │
│   └── practice-sessions/            # historial de prácticas por usuario
│       ├── practice-sessions.controller.ts
│       ├── practice-sessions.service.ts
│       └── dto/                      # create, query
│
├── .env / .env.example               # variables de entorno (NUNCA commitear .env real)
├── nest-cli.json
├── package.json
├── tsconfig.json
├── Procfile                          # comando de arranque para Railway/Heroku
├── railway.toml                      # config específica de Railway
├── nixpacks.toml                     # build con nixpacks
└── README.md                         # este archivo
```

---

## 7. Autenticación: el flow completo

La API usa **dos tokens** por usuario:

- **access token** (15 min, JWT): viaja en `Authorization: Bearer <token>`
  en cada request. Lo valida la estrategia `passport-jwt` (`JwtAuthGuard`).
- **refresh token** (7 d, JWT): vive en el cliente y se envía en el body a
  `/auth/refresh` para pedir un nuevo access. En BD guardamos **solo su hash
  bcrypt** (`User.hashedRefreshToken`), no el token crudo. Eso permite
  revocarlo en `logout`.

```
┌────────┐                ┌──────────┐
│ Client │                │   API    │
└───┬────┘                └────┬─────┘
    │  POST /auth/register      │
    │  { email, password }      │
    │ ─────────────────────────▶│
    │                           │  crea user, hashea password,
    │                           │  emite access+refresh, guarda hash(refresh)
    │ ◀─────────────────────────│
    │  { user, accessToken, refreshToken }
    │
    │  GET /shortcuts
    │  Authorization: Bearer <access>
    │ ─────────────────────────▶│  JwtAuthGuard → req.user
    │ ◀─────────────────────────│  200 + lista
    │
    │  (15 min después, access expiró)
    │  POST /auth/refresh
    │  { refreshToken: "..." }   │  RefreshAuthGuard valida firma+expiración,
    │ ─────────────────────────▶│  AuthService compara hash con BD
    │ ◀─────────────────────────│  { accessToken: "<nuevo>", refreshToken: "<mismo>" }
    │
    │  POST /auth/logout
    │  Authorization: Bearer <access>
    │ ─────────────────────────▶│  setea hashedRefreshToken = NULL
    │ ◀─────────────────────────│  { ok: true }
```

**Lo que NO se hace (todavía):** rotación del refresh token. Hoy `refresh`
devuelve el mismo refresh token; en prod conviene rotarlo y revocar el viejo
(recomendación OWASP).

---

## 8. Endpoints

Todos los endpoints están bajo el prefijo `/api`. Los marcados con 🔒
requieren `Authorization: Bearer <accessToken>` (salvo `/auth/refresh` que usa
otro flujo, ver abajo).

### 8.1 Auth (`/auth`)

| Método | Ruta | Auth | Body | Respuesta |
|---|---|---|---|---|
| POST | `/auth/register` | — | `{ email, password }` | `201` `{ user, accessToken, refreshToken }` |
| POST | `/auth/login` | — | `{ email, password }` | `200` `{ user, accessToken, refreshToken }` |
| POST | `/auth/refresh` | refresh (en body) | `{ refreshToken }` | `200` `{ accessToken, refreshToken }` |
| POST | `/auth/logout` | 🔒 | — | `200` `{ ok: true }` |
| GET | `/auth/me` | 🔒 | — | `200` `{ sub, email }` |

Errores: `409` si el email ya existe, `401` en login/refresh inválido.

### 8.2 Shortcuts (`/shortcuts`) — catálogo global 🔒

| Método | Ruta | Body / Query | Notas |
|---|---|---|---|
| GET | `/shortcuts?tool=VS%20Code` | — | Lista del catálogo. Filtro opcional por tool. |
| GET | `/shortcuts/:id` | — | `404` si no existe. |
| POST | `/shortcuts` | `{ action, tool, expectedCombo: string[], category?, level? }` | `201`. `level` default `BEGINNER`. |
| PATCH | `/shortcuts/:id` | `Partial<Create>` | "Al menos un campo" obligatorio (validado en el service). |
| DELETE | `/shortcuts/:id` | — | `200` `{ ok: true }`. Las practice_sessions con ese `shortcutId` quedan en `NULL`. |

`expectedCombo` entra y sale como `string[]` (ej: `["Ctrl", "Shift", "P"]`)
aunque en BD se guarda como `"Ctrl,Shift,P"`.

### 8.3 Practice Sessions (`/practice-sessions`) 🔒

| Método | Ruta | Body / Query | Notas |
|---|---|---|---|
| POST | `/practice-sessions` | `{ accuracy, timeSpentMs, mistakes, shortcutId?, notes? }` | `201`. `accuracy` ∈ `[0, 1]`. `shortcutId` opcional, debe existir. |
| GET | `/practice-sessions?limit=20&offset=0&shortcutId=...` | — | Solo sesiones del usuario logueado. Paginado. |
| GET | `/practice-sessions/:id` | — | `404` si no es del usuario. |

---

## 9. Ejemplos curl

```bash
# 0) Sacar el BASE una vez
export API=http://localhost:3000/api

# 1) Register
curl -X POST $API/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"santi@test.com","password":"Santi1234"}'

# 2) Login
curl -X POST $API/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"santi@test.com","password":"Santi1234"}'

# 3) Listar catálogo filtrado por tool
curl $API/shortcuts?tool=VS%20Code \
  -H "Authorization: Bearer $ACCESS"

# 4) Crear un shortcut custom (aunque el catálogo es global, podés sumar)
curl -X POST $API/shortcuts \
  -H "Authorization: Bearer $ACCESS" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "Toggle terminal",
    "tool": "VS Code",
    "expectedCombo": ["Ctrl", "`"],
    "category": "view",
    "level": "BEGINNER"
  }'

# 5) Registrar una práctica
curl -X POST $API/practice-sessions \
  -H "Authorization: Bearer $ACCESS" \
  -H "Content-Type: application/json" \
  -d '{
    "accuracy": 0.92,
    "timeSpentMs": 12500,
    "mistakes": 2,
    "shortcutId": "8e3f19ef-1199-4d9d-a527-77566d22df64",
    "notes": "Primera vez con este combo"
  }'

# 6) Historial paginado
curl "$API/practice-sessions?limit=10&offset=0" \
  -H "Authorization: Bearer $ACCESS"
```

---

## 10. Catálogo de shortcuts

El catálogo vive en **`prisma/data/catalogo.json`** y se carga con `pnpm seed`.

Formato esperado por ítem:

```json
{
  "id": 17,
  "description": "Abrir la paleta de comandos",
  "expectedCombo": "Ctrl+Shift+P",
  "tool": "VS Code",
  "level": 3
}
```

Mapeo que hace el seed:
- `description` → `action`
- `expectedCombo` → split por `+` → `["Ctrl","Shift","P"]` → serializado a `"Ctrl,Shift,P"` en BD
- `level` (1-4) → enum `Level` (`BEGINNER`/`INTERMEDIATE`/`ADVANCED`/`EXPERT`)
- `tool` → `tool`

El seed es **idempotente**: borra todos los shortcuts del catálogo antes de
recargar, así que re-correrlo deja el mismo estado final. Las
`PracticeSession` que apunten a shortcuts eliminados quedan con
`shortcutId = NULL` (no se rompen).

Para agregar atajos custom: editá el JSON y volvé a correr `pnpm seed`, **o**
usá `POST /shortcuts` desde el front con un usuario autenticado.

---

## 11. Deploy en Railway

El repo incluye la config lista para Railway:

- `Procfile`: comando de arranque en producción.
- `railway.toml`: región, healthcheck, etc.
- `nixpacks.toml`: builder.

Pasos resumidos:

1. Crear un proyecto en Railway y linkear el repo.
2. Agregar un servicio **PostgreSQL** desde el marketplace.
3. Setear las variables de entorno en Railway (especialmente
   `DATABASE_URL` toma la URL del Postgres de Railway, y los dos `JWT_*_SECRET`).
4. `start:prod` ya corre `prisma migrate deploy && node dist/main.js`, así
   que las migraciones se aplican en cada deploy.
5. (Opcional) Para sembrar el catálogo una vez: ejecutar `pnpm seed` desde
   la consola de Railway o vía un job.

⚠️ **No commitees `.env` real** — Railway lo lee de su panel.

---

## 12. Decisiones de diseño

- **Catálogo global vs por usuario.** Empezó por usuario, se cambió a global
  para que el seed inicial pueda ser compartido. Si en el futuro querés
  atajos privados por usuario, hay que volver a poner `userId` en `Shortcut`
  (con su índice y migración).
- **`expectedCombo` como `String` en BD, `string[]` en la API.** Más portable
  entre DBs (Postgres `text[]` anda pero no en SQLite si alguna vez migrás),
  y nos permite indexar y buscar por substring si hace falta. La
  conversión vive en `ShortcutsService`.
- **Refresh token con hash en BD.** El JWT crudo va al cliente; en BD solo
  guardamos su `bcrypt` hash. Permite revocación inmediata vía `logout`. El
  costo: una query extra a BD en cada `refresh`. Vale la pena.
- **Rate limit por capas.** 100 req/min global + 10 req/min en `/auth` (que
  es donde se hacen ataques de fuerza bruta). Configurable por env vars.
- **Validación con `whitelist` + `forbidNonWhitelisted`.** Si el front manda
  un campo extra, la API responde 400 (en vez de ignorarlo silenciosamente).
  Esto protege contra typos en DTOs y payloads malformados.
- **Errores uniformes.** `HttpExceptionFilter` global. Todos los errores
  salen con la misma forma: `{ statusCode, message, error }` (más `path` y
  `timestamp` si querés agregar después).
- **Swagger siempre disponible.** Útil para el front y para que cualquiera
  pueda probar la API sin leer el código. En prod podrías apagarlo detrás
  de un env var (`NODE_ENV !== 'production'`), pero hoy está abierto.

---

## 13. Troubleshooting

**"PrismaClientInitializationError" al levantar**
→ La DB no responde. Chequear `DATABASE_URL` y que Postgres esté corriendo
(`Test-NetConnection localhost 5432` en PowerShell).

**"Environment variable not found: DATABASE_URL"**
→ No corriste `cp .env.example .env` o el archivo no está en la raíz.

**401 al pegar el access token en Swagger**
→ El token expiró (15 min) o está mal copiado. Volvé a hacer `/auth/login`
y pegá el `accessToken` completo. Recordá que Swagger tiene
`persistAuthorization: true`, pero el token igual vence.

**CORS error desde el front**
→ Sumá el origen a `CORS_ORIGINS` en `.env` (separado por coma, sin
espacios al final). Reiniciá el server.

**"Too Many Requests"**
→ Te comiste el rate limit (100/min global o 10/min en `/auth`). Subilo en
`.env` o esperá la ventana.

**El seed no carga nada**
→ El JSON debe tener `description`, `expectedCombo`, `tool` y `level` en
rango 1-4. Si hay items con `level` fuera de rango, el seed los saltea con
un warning. Mirá la consola.

**`pnpm prisma migrate dev` se queda colgado pidiendo confirmación**
→ Está intentando borrar una columna con datos. Limpiá primero con
`node scripts/clear-shortcuts.cjs` (en el caso de `shortcuts`) o borrá los
datos manualmente desde Prisma Studio.

---

## 14. Scripts disponibles

```bash
pnpm start:dev        # nest start --watch
pnpm start:prod       # prisma migrate deploy && node dist/main.js
pnpm build            # nest build
pnpm lint             # eslint con --fix
pnpm prisma:generate  # prisma generate
pnpm prisma:migrate   # prisma migrate dev (interactivo, dev)
pnpm prisma:deploy    # prisma migrate deploy (CI/prod)
pnpm prisma:studio    # GUI para inspeccionar la DB
pnpm seed             # ts-node prisma/seed.ts
```
