# Capa de base de datos (`src/database/`)

Este documento describe cómo está montada la capa de datos de este proyecto y las reglas que hay que seguir
al tocarla — para cualquier persona o asistente de código, sin importar la herramienta que use. El alcance de
este documento es únicamente `src/database/` (schema, migraciones y seeds). El proyecto está diseñado para
que migraciones, seeds y schema sigan siempre el mismo patrón, y las herramientas (`db:*` scripts) asumen que
se respeta.

Este proyecto usa **Bun** como package manager y runner (`bun.lock` en la raíz) — todos los comandos abajo son
`bun run ...`, no `npm run ...`.

ORM: **Drizzle** (`drizzle-orm` + `drizzle-kit`). Las migraciones de schema se generan y aplican con
`drizzle-kit` (flujo nativo, sin `up`/`down` escritos a mano). Los seeds **no** tienen equivalente en
`drizzle-kit`, así que siguen el patrón hecho a mano de este proyecto (generador con timestamp +
[Umzug](https://github.com/sequelize/umzug) con `up`/`down`/`status`), apuntando a Drizzle en vez de
Sequelize.

## Mapa de esta carpeta

```
src/database/
├── config/
│   ├── database-connection.factory.ts # Pool + drizzle() para el DatabaseModule de Nest
│   ├── cli-drizzle.config.ts          # Pool + drizzle() standalone para el seeder
│   ├── pg-umzug-storage.ts            # UmzugStorage propio sobre `pg`, usado por los seeds
│   ├── seed-template.ts               # Plantilla que usa el generador de seeds (up/down vacíos)
│   ├── create-timestamped-file.ts     # Crea el archivo <timestamp>-<name>.ts en la carpeta indicada
│   └── run-umzug-command.ts           # up / down / down:all / status sobre una instancia de Umzug
├── types/
│   └── drizzle.types.ts               # DrizzleDb / DrizzleTx (tipos compartidos)   
├── interfaces/                        # DatabaseEnvInterface
├── schema/
│   ├── auth-env.schema.ts                 # Tablas de Better Auth (user, session, account, verification)
│   └── index.ts                       # Registro central de TODAS las tablas — source of truth de drizzle-kit
├── migrations/                        # *.sql + meta/, generados por `drizzle-kit generate` (nunca a mano)
├── seeders/                           # Un archivo por seed, generado por el script (nunca a mano)
├── scripts/                           # Entry points que corren los scripts db:seed:* y db:migrate:status
├── util/database-options.util.ts      # Arma la config de conexión (`pg.PoolConfig`) desde el env
├── database.constants.ts              # Token `DRIZZLE` para inyección de dependencias en Nest
└── database.module.ts                 # Módulo Nest que provee la conexión Drizzle bajo el token DRIZZLE
```

## Migraciones: `drizzle-kit`, sin `up`/`down` a mano

A diferencia de los seeds, las migraciones de schema **no** se escriben a mano: `drizzle-kit generate` diffea
`schema/index.ts` contra el historial en `migrations/meta/` y genera el `.sql` correspondiente.

```bash
# 1. Editar/crear la tabla en schema/ (ver sección Schema) y registrarla en schema/index.ts
# 2. Generar la migración
bun run db:migration:generate -- --name=create_<tabla>_table

# 3. Revisar el .sql generado en src/database/migrations/ (se commitea tal cual, no se edita a mano)
# 4. Aplicarla
bun run db:migrate

# 5. Confirmar
bun run db:migrate:status
```

| Comando | Qué hace |
|---|---|
| `bun run db:migration:generate -- --name=<nombre>` | Diffea `schema/index.ts` y genera `src/database/migrations/<n>_<nombre>.sql` |
| `bun run db:migrate` | Aplica todas las migraciones pendientes (`drizzle-kit migrate`), trackeadas en `drizzle.__drizzle_migrations` |
| `bun run db:migrate:status` | Lista migraciones ejecutadas y pendientes (script propio, ver Gotchas) |

**No hay `down`.** `drizzle-kit` no genera reversiones — para deshacer un cambio de schema se ajusta el
schema (por ejemplo, se borra la columna agregada) y se corre `db:migration:generate` de nuevo, generando una
migración nueva que aplica el cambio inverso. No se edita ni se borra una migración ya generada y commiteada.

Todos los comandos leen la conexión de `.env` (`DB_HOST`, `DB_PORT`, `DB_USERNAME`, `DB_PASSWORD`, `DB_NAME`,
`DB_LOGGING`, validados con Zod en `src/common/schemas/database.schema.ts`) a través de `drizzle.config.ts`
en la raíz de `apps/auth`.

## Seeds: generador + Umzug a mano (igual que antes, sobre Drizzle)

`drizzle-kit` no tiene concepto de seeds, así que esta parte del flujo se mantiene tal como estaba con
Sequelize, sólo que corriendo sobre Drizzle: **siempre** se generan con el script correspondiente. El nombre
del archivo lleva un timestamp (`YYYYMMDDHHmmss-<nombre>.ts`) que determina el orden de ejecución — calcularlo
o escribirlo a mano rompe ese orden.

```bash
bun run db:seed:generate -- seed_initial_data
```

Esto crea `src/database/seeders/<timestamp>-seed_initial_data.ts` con el `up`/`down` vacíos (`// TODO:
implement`). **Después de generarlo es cuando se edita el contenido** — nunca se crea el archivo directamente
a mano. Si no se pasa nombre, el generador le pone uno aleatorio (`idUtil('seed', 10)`); siempre es mejor
pasar uno descriptivo.

### Cómo funciona el ejecutor por dentro

`seeder.ts` (en `src/database/scripts/`) usa Umzug con `PgUmzugStorage` (`src/database/config/`), un
`UmzugStorage` propio sobre `pg` puro que reemplaza a `SequelizeStorage`: crea (si no existe) la tabla
`drizzle_seeds` con una columna `name`, y guarda ahí qué seeds ya corrieron. **Importante:** el `cwd` de Umzug
en `seeder.ts` tiene que apuntar a la carpeta padre de `scripts/` (`join(__dirname, '..')`), no a `__dirname`
a secas — si alguien lo cambia a `__dirname`, Umzug busca en `scripts/seeders` (que no existe) y `status`
reporta todo como pendiente aunque los seeds ya se hayan corrido. Este bug ya se dio una vez en este proyecto
con las migraciones (cuando corrían sobre el mismo patrón); si algo se ve "invisible" para el CLI, es lo
primero a revisar.

### Comandos disponibles

| Comando | Qué hace |
|---|---|
| `bun run db:seed:generate -- <nombre>` | Crea un archivo de seed vacío en `src/database/seeders/` |
| `bun run db:seed` | Corre todos los seeds pendientes (`up`) |
| `bun run db:seed:undo` | Revierte el último seed ejecutado (`down`) |
| `bun run db:seed:undo:all` | Revierte todos los seeds |
| `bun run db:seed:status` | Lista seeds ejecutados y pendientes, sin aplicar nada |

## El `up`/`down` de un seed real usa `db.transaction`, no try/catch manual

El `up` y el `down` de cada seed con contenido real corren dentro de `db.transaction(async (tx) => { ... })`.
A diferencia del `queryInterface.sequelize.transaction()` de Sequelize (que exigía `commit`/`rollback`
explícitos en un `try/catch`), `db.transaction` de Drizzle ya hace commit automático si la función resuelve y
rollback automático si lanza — no hace falta el `try/catch` manual.

Plantilla que genera `db:seed:generate` (`src/database/config/seed-template.ts`):

```ts
import { MigrationFn } from 'umzug';
import { DrizzleDb } from '@database/types/drizzle.types';

export const up: MigrationFn<DrizzleDb> = async ({ context: db }) => {
  await db.transaction(async (tx) => {
    // TODO: implement
  });
};

export const down: MigrationFn<DrizzleDb> = async ({ context: db }) => {
  await db.transaction(async (tx) => {
    // TODO: implement
  });
};
```

Un seed real usa el query builder de Drizzle dentro de esa transacción:

```ts
import { eq } from 'drizzle-orm';
import { user } from '@database/schema';

export const up: MigrationFn<DrizzleDb> = async ({ context: db }) => {
  await db.transaction(async (tx) => {
    await tx.insert(user).values({ id: 'demo', name: 'Demo', email: 'demo@example.com' });
  });
};

export const down: MigrationFn<DrizzleDb> = async ({ context: db }) => {
  await db.transaction(async (tx) => {
    await tx.delete(user).where(eq(user.id, 'demo'));
  });
};
```

## Schema

Toda tabla se registra en `src/database/schema/index.ts`:

```ts
export * from './auth.schema';
```

**Ese archivo es la única fuente de verdad que ve `drizzle-kit`** (apunta ahí el `schema` de
`drizzle.config.ts`) — una tabla definida en su propio archivo pero no re-exportada desde `index.ts` no
genera migraciones y tampoco es visible para el `db` que inyecta `DatabaseModule`.

## Checklist: agregar una entidad nueva

1. Tabla en `src/database/schema/<nombre>.schema.ts`. Registrarla en `src/database/schema/index.ts`.
2. `bun run db:migration:generate -- --name=create_<tabla>_table` y revisar el `.sql` generado.
3. `bun run db:migrate` para aplicarla (y `db:migrate:status` para confirmar).
4. Si hace falta data inicial: `bun run db:seed:generate -- seed_<algo>` con el patrón de `db.transaction`
   de la sección Seeds.

## Gotchas ya encontrados en este proyecto (evitar repetirlos)

- **`schema/index.ts` es la única fuente de verdad para `drizzle-kit`.** Si una tabla no está re-exportada
  ahí, no se genera migración para ella y el `db` de Nest tampoco la conoce (aunque el archivo de la tabla
  exista y compile bien). Es el mismo gotcha que había con `models/index.ts` y Sequelize, adaptado.
- **`cwd` de Umzug en `seeder.ts` debe ser `join(__dirname, '..')`**, no `__dirname`. Si alguien lo
  "simplifica" a `__dirname`, el CLI deja de ver los archivos de `seeders/` y todo comando (`up`, `down`,
  `status`) se comporta como si no hubiera nada que hacer, sin tirar error.
- **No hay `down` para migraciones de schema** (sí para seeds). Revertir un cambio de schema es: ajustar
  `schema/`, correr `db:migration:generate` de nuevo, y aplicar la migración resultante — nunca editar o
  borrar un `.sql` ya generado y commiteado.
- **`ssl` en `drizzle.config.ts` debe fijarse explícitamente (`ssl: false` para una Postgres local sin
  TLS).** Si se omite, `drizzle-kit migrate`/`push` arman un objeto `ssl: {}` internamente (que para el
  driver `pg` cuenta como "pedir SSL"), lo que hace fallar la conexión en silencio contra una base sin SSL
  habilitado — el CLI queda pegado en el spinner "applying migrations..." y sale con código 1 sin imprimir
  ningún error legible. Ya pasó una vez en este proyecto.
## Resumen rápido

- Nunca crear un archivo dentro de `migrations/` a mano — siempre `db:migration:generate` y revisar el
  `.sql` resultante. Nunca crear un archivo dentro de `seeders/` a mano — siempre `db:seed:generate` y
  editar el archivo resultante.
- Nunca calcular a mano el timestamp de un archivo de seed ni el número de una migración.
- Los seeds con contenido real corren dentro de `db.transaction(async (tx) => { ... })`, sin try/catch
  manual (Drizzle hace commit/rollback automático).
- Toda tabla nueva se registra en `src/database/schema/index.ts`.
- Antes de dar por buena una migración o una tabla nueva, correr `bun run db:migrate:status` y, si se puede,
  probar `db:migration:generate` → `db:migrate` contra una base real para confirmar que el ciclo completo
  funciona.
