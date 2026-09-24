# Capa de base de datos (`src/database/`)

Este documento describe cómo está montada la capa de datos de este proyecto y las reglas que hay que seguir
al tocarla — para cualquier persona o asistente de código, sin importar la herramienta que use. El alcance de
este documento es únicamente `src/database/` (modelos, migraciones, seeds, repositorios, servicio CRUD) y
cómo lo consume cada feature en `src/<feature>/`. El proyecto está diseñado para que migraciones, seeds,
modelos, repositorios y servicios sigan siempre el mismo patrón, y las herramientas (`db:*` scripts) asumen
que se respeta.

Este proyecto usa **Bun** como package manager y runner (`bun.lock` en la raíz) — todos los comandos abajo son
`bun run ...`, no `npm run ...`.

## Mapa de esta carpeta

```
src/database/
├── config/
│   ├── cli-sequelize.config.ts   # Instancia Sequelize para los scripts de CLI (migrator/seeder)
│   ├── sequelize.config.ts       # Factory de SequelizeModuleOptions para el DatabaseModule de Nest
│   ├── migration-template.ts     # Plantilla que usan los generadores (up/down vacíos)
│   ├── create-timestamped-file.ts# Crea el archivo <timestamp>-<name>.ts en la carpeta indicada
│   └── run-umzug-command.ts      # up / down / down:all / status sobre una instancia de Umzug
├── interfaces/                   # Contratos: RepositoryInterface, RepositoryOptionsInterface, etc.
├── models/
│   ├── base.model.ts             # BaseModel abstracto: id, createdAt, updatedAt, deletedAt
│   ├── example.model.ts          # Modelo de referencia (ver sección Modelos)
│   └── index.ts                  # Registro central de TODOS los modelos concretos (@Table)
├── migrations/                   # Un archivo por migración, generado por el script (nunca a mano)
├── seeders/                      # Un archivo por seed, generado por el script (nunca a mano)
├── repositories/
│   └── abstract.repository.ts    # CRUD genérico sobre cualquier modelo (create, findAll, etc.)
├── services/
│   └── crud.service.ts           # Capa de servicio genérica que delega en un repositorio
├── scripts/                      # Entry points que corren los scripts db:*
├── util/database-options.util.ts # Arma SequelizeOptions común (incluye `models` de models/index.ts)
└── database.module.ts            # Módulo Nest que registra Sequelize (SequelizeModule.forRootAsync)
```

Fuera de `src/database`, cada feature vive en `src/<feature>/` (ver `src/examples/` como referencia completa:
modelo → repositorio → servicio → controlador → módulo).

## Regla de oro: migraciones y seeds NUNCA se escriben a mano desde cero

**Siempre** se generan con el script correspondiente. El nombre del archivo lleva un timestamp
(`YYYYMMDDHHmmss-<nombre>.ts`) que determina el orden de ejecución — calcularlo o escribirlo a mano rompe ese
orden y además tienta a poner el archivo en la carpeta equivocada.

```bash
# Migración nueva
bun run db:migration:generate -- create_examples_table

# Seed nuevo
bun run db:seed:generate -- seed_initial_examples
```

Esto crea `src/database/migrations/<timestamp>-create_examples_table.ts` (o el equivalente en `seeders/`) con
el `up`/`down` vacíos (`// TODO: implement`). **Después de generarlo es cuando se edita el contenido** —
nunca se crea el archivo directamente a mano.

Si no se pasa nombre, el generador le pone uno aleatorio (`idUtil('mig', 10)` / `idUtil('seed', 10)`); siempre
es mejor pasar un nombre descriptivo.

### Cómo funcionan los ejecutores por dentro

`migrator.ts` y `seeder.ts` (en `src/database/scripts/`) usan [Umzug](https://github.com/sequelize/umzug) con
`SequelizeStorage`:

- El migrator busca `migrations/*.ts` con `cwd: join(__dirname, '..')` (es decir, `src/database/migrations`) y
  guarda el estado ejecutado en la tabla `SequelizeMeta`.
- El seeder busca `seeders/*.ts` de la misma forma y guarda su estado en `SequelizeSeeds` (tabla separada, para
  que migraciones y seeds no se pisen entre sí).
- **Importante:** el `cwd` tiene que apuntar a la carpeta padre de `scripts/` (`join(__dirname, '..')`), no a
  `__dirname` a secas — si alguien lo cambia a `__dirname`, Umzug busca en `scripts/migrations` (que no existe)
  y `status` reporta todo como pendiente aunque las migraciones ya se hayan corrido. Este bug ya se dio una vez
  en este proyecto; si algo se ve "invisible" para el CLI, es lo primero a revisar.
- `run-umzug-command.ts` traduce el argumento de línea de comandos (`up`, `down`, `down:all`, `status`) a la
  llamada de Umzug correspondiente.

### Comandos disponibles

| Comando | Qué hace |
|---|---|
| `bun run db:migration:generate -- <nombre>` | Crea un archivo de migración vacío en `src/database/migrations/` |
| `bun run db:migrate` | Corre TODAS las migraciones pendientes (`up`) |
| `bun run db:migrate:undo` | Revierte la ÚLTIMA migración ejecutada (`down`) |
| `bun run db:migrate:undo:all` | Revierte TODAS las migraciones (`down` hasta el principio) |
| `bun run db:migrate:status` | Lista migraciones ejecutadas y pendientes, sin aplicar nada |
| `bun run db:seed:generate -- <nombre>` | Crea un archivo de seed vacío en `src/database/seeders/` |
| `bun run db:seed` | Corre todos los seeds pendientes |
| `bun run db:seed:undo` | Revierte el último seed ejecutado |
| `bun run db:seed:undo:all` | Revierte todos los seeds |
| `bun run db:seed:status` | Lista seeds ejecutados y pendientes |

Todos leen la conexión de `.env` (`DB_HOST`, `DB_PORT`, `DB_USERNAME`, `DB_PASSWORD`, `DB_NAME`, `DB_LOGGING`,
validados con Zod en `src/common/schemas/database.schema.ts`).

## Toda migración y seed real va envuelta en una transacción manual (commit/rollback)

El `up` y el `down` de cada migración/seed con contenido real deben abrir su propia transacción con
`queryInterface.sequelize.transaction()` y hacer `commit`/`rollback` explícito en un `try/catch`. Esto es así
aunque una sola sentencia DDL/DML ya sea atómica en Postgres — es el patrón fijo del proyecto para que
migraciones con varios pasos (crear tabla + índices + constraints, por ejemplo) sean todo-o-nada.

Ejemplo real y canónico (mantenido a propósito con extensión `.ts.example` para que Umzug no lo tome como una
migración pendiente) — `src/database/migrations/20260918100727-create_examples_table.ts.example`:

```ts
import { DataTypes, QueryInterface } from 'sequelize';
import { MigrationFn } from 'umzug';
import { Sequelize } from 'sequelize-typescript';

export const up: MigrationFn<QueryInterface> = async ({
  context: queryInterface,
}) => {
  const transaction = await queryInterface.sequelize.transaction();

  try {
    await queryInterface.createTable(
      'examples',
      {
        id: {
          type: DataTypes.UUID,
          primaryKey: true,
          defaultValue: Sequelize.literal('uuidv7()'),
        },
        title: { type: DataTypes.STRING, allowNull: false },
        description: { type: DataTypes.STRING, allowNull: true },
        is_active: {
          type: DataTypes.BOOLEAN,
          allowNull: false,
          defaultValue: true,
        },
        created_at: { type: DataTypes.DATE, defaultValue: Sequelize.fn('NOW') },
        updated_at: { type: DataTypes.DATE, defaultValue: Sequelize.fn('NOW') },
        deleted_at: { type: DataTypes.DATE, allowNull: true },
      },
      { transaction },
    );
    await transaction.commit();
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
};

export const down: MigrationFn<QueryInterface> = async ({
  context: queryInterface,
}) => {
  const transaction = await queryInterface.sequelize.transaction();

  try {
    await queryInterface.dropTable('examples', { transaction });
    await transaction.commit();
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
};
```

Reglas al escribir el contenido de una migración:

- Todas las llamadas a `queryInterface.*` dentro del `up`/`down` reciben `{ transaction }`.
- Las columnas van en **snake_case** (`created_at`, `is_active`, ...) porque los modelos declaran
  `underscored: true` — el nombre de columna en la migración tiene que calzar con lo que Sequelize va a pedir.
- Si la tabla usa soft delete (ver `BaseModel`), la migración crea las tres columnas de auditoría
  (`created_at`, `updated_at`, `deleted_at`) además de `id`.
- El `down` siempre deshace exactamente lo que hizo el `up` (si el `up` crea una tabla, el `down` la
  dropea; si agrega una columna, el `down` la quita — no dejar el `down` como `// TODO`).

Un seed con datos reales sigue el mismo patrón, pero usando `queryInterface.bulkInsert` /
`queryInterface.bulkDelete` dentro de la transacción en vez de DDL:

```ts
export const up: MigrationFn<QueryInterface> = async ({ context: queryInterface }) => {
  const transaction = await queryInterface.sequelize.transaction();
  try {
    await queryInterface.bulkInsert('examples', [{ title: 'Demo', is_active: true }], { transaction });
    await transaction.commit();
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
};

export const down: MigrationFn<QueryInterface> = async ({ context: queryInterface }) => {
  const transaction = await queryInterface.sequelize.transaction();
  try {
    await queryInterface.bulkDelete('examples', { title: 'Demo' }, { transaction });
    await transaction.commit();
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
};
```

## Modelos

### `BaseModel` — por defecto, todo modelo lo extiende

`src/database/models/base.model.ts`:

```ts
export abstract class BaseModel<
  TModelAttributes extends object = any,
  TCreationAttributes extends object = TModelAttributes,
> extends Model<TModelAttributes, TCreationAttributes> {
  @PrimaryKey
  @Default(Sequelize.literal('uuidv7()'))
  @Column(DataType.UUID)
  declare id: string;

  @CreatedAt
  declare createdAt: Date;

  @UpdatedAt
  declare updatedAt: Date;

  @DeletedAt
  declare deletedAt: Date | null;
}
```

Da a cualquier modelo, gratis: `id` (UUID v7, generado por Postgres — ver abajo por qué), `createdAt`,
`updatedAt` y soft delete (`deletedAt`) vía `paranoid`.

**Regla:** todo modelo nuevo **extiende `BaseModel`**, salvo que explícitamente no deba tener soft delete
(tablas pivote/join puras, tablas de auditoría/log que no se borran nunca, tablas de solo-lectura desde otro
sistema). En ese caso —y sólo en ese caso— el modelo extiende `Model` de `sequelize-typescript` directamente y
declara a mano los campos que sí necesite (`id`/`createdAt`/`updatedAt` sueltos, sin `deletedAt`).

Un modelo concreto:

```ts
import { AllowNull, Column, DataType, Default, Table } from 'sequelize-typescript';
import { BaseModel } from '../database/models/base.model';

@Table({ tableName: 'examples', underscored: true, paranoid: true })
export class ExampleModel extends BaseModel {
  // id, createdAt, updatedAt, deletedAt vienen de BaseModel — NO se redeclaran.

  @Column
  declare title: string;

  @AllowNull
  @Column(DataType.STRING) // tipo explícito: obligatorio en toda columna nullable (ver Gotchas)
  declare description: string | null;

  @Default(true)
  @Column
  declare isActive: boolean;
}
```

`@Table` siempre lleva `underscored: true` (columnas snake_case en la DB, atributos camelCase en TS) y
`paranoid: true` si el modelo extiende `BaseModel`.

Todo modelo concreto (con `@Table`) se registra en `src/database/models/index.ts`:

```ts
const models: ModelCtor[] = [ExampleModel /*, OtroModel, ... */];
```

Ese arreglo es la única fuente de verdad: lo consume `databaseOptionsUtil` y de ahí llega tanto a
`DatabaseModule` (la app Nest) como a `cli-sequelize.config.ts` (los scripts de migración/seed). No hace falta
(ni existe) `autoLoadModels` — si el modelo no está en `models/index.ts`, Sequelize no lo conoce.

## Repositorios

Cada feature tiene su propio repositorio que extiende `AbstractRepository<TModel>`
(`src/database/repositories/abstract.repository.ts`), que ya implementa `create`, `insertMany`,
`findOrCreate`, `findByPk`, `findOne`, `findAll`, `findAllPaginated`, `updateByPk`, `updateByQuery`,
`deleteByPk`, `restoreByPk` y `transaction`. **No se reimplementan estos métodos a mano** — si falta algo,
se agrega a `AbstractRepository` (o al `CrudService`) para que lo hereden todos los repositorios, no en el
repositorio concreto.

```ts
@Injectable()
export default class ExampleRepository extends AbstractRepository<ExampleModel> {
  constructor() {
    super(ExampleModel, {
      logger: new Logger(ExampleRepository.name),
      // idGenerator es OPCIONAL: si no se pasa, el id lo genera la base de datos
      // (defaultValue de la columna, definido en BaseModel/la migración).
      // Solo se pasa idGenerator si este repositorio necesita calcular el id en Node
      // antes del INSERT (por ejemplo, para usarlo en otra operación de la misma transacción
      // antes de guardar).
    });
  }
}
```

`AbstractRepository` no se puede instanciar directamente (tira `ConflictException` si se intenta) — siempre
via una subclase.

## Servicios (`CrudService`)

`src/database/services/crud.service.ts` es la capa de servicio genérica: recibe el repositorio por
constructor y delega cada método de `RepositoryInterface`. Un servicio de feature extiende `CrudService` para
heredar todo el CRUD gratis y encima agrega su lógica de negocio propia:

```ts
@Injectable()
export default class ExamplesService extends CrudService<ExampleModel, ExampleRepository> {
  constructor(repository: ExampleRepository) {
    super(repository);
  }

  public createExample = async (dto: CreateExampleDto) => {
    dto.title = dto.title.toUpperCase();
    await this.create({ ...dto }); // this.create ya viene de CrudService
  };
}
```

El controlador nunca toca el repositorio directamente, siempre pasa por el servicio:

```ts
@Controller('examples')
export default class ExamplesController {
  constructor(private readonly examplesService: ExamplesService) {}

  @Post()
  public async createExample(@Body() dto: CreateExampleDto) {
    return await this.examplesService.createExample(dto);
  }
}
```

## Checklist: agregar una entidad nueva

1. `bun run db:migration:generate -- create_<tabla>_table` y completar `up`/`down` con transacción manual
   (ver plantilla arriba). Columnas en snake_case; si hay soft delete, incluir `deleted_at`.
2. `bun run db:migrate` para aplicarla (y `db:migrate:status` para confirmar).
3. Modelo en `src/database/models/<nombre>.model.ts`, extendiendo `BaseModel` (o `Model` si no debe tener
   soft delete), con `@Table({ tableName: '<tabla>', underscored: true, paranoid: true })`.
4. Registrar el modelo en `src/database/models/index.ts`.
5. Repositorio en `src/<feature>/<nombre>.repository.ts`, extendiendo `AbstractRepository<TuModel>`.
6. Servicio en `src/<feature>/<nombre>.service.ts`, extendiendo `CrudService<TuModel, TuRepository>` +
   métodos de negocio propios.
7. Controlador + DTOs + módulo Nest, como en `src/examples/`.
8. Si hace falta data inicial: `bun run db:seed:generate -- seed_<algo>` con el mismo patrón de transacción.

## Gotchas ya encontrados en este proyecto (evitar repetirlos)

- **`cwd` de Umzug en `migrator.ts`/`seeder.ts` debe ser `join(__dirname, '..')`**, no `__dirname`. Si alguien
  lo "simplifica" a `__dirname`, el CLI deja de ver los archivos de `migrations/`/`seeders/` y todo comando
  (`up`, `down`, `status`) se comporta como si no hubiera nada que hacer, sin tirar error.
- **Columnas nullable necesitan tipo explícito en `@Column`.** `@Column` a secas sobre un atributo tipado
  `string | null` (o cualquier unión) revienta en runtime con
  `Specified type of property '...' cannot be automatically resolved to a sequelize data type`, porque
  TypeScript emite `design:type: Object` para los tipos unión y sequelize-typescript no puede inferir la
  columna. Solución: `@Column(DataType.STRING)` (o el tipo que corresponda) siempre que el atributo pueda ser
  `null`.
- **`@Default(DataType.UUID)` NO genera UUIDs.** `DataType.UUID` es el *tipo* de columna, no un generador de
  valores — usarlo en `@Default` manda literalmente el string `"UUID"` como valor y Postgres lo rechaza
  (`invalid input syntax for type uuid: "UUID"`).
- **Para que el id lo genere la base de datos (no Node) hace falta `Sequelize.literal('uuidv7()')` en
  `@Default`, no `DataType.UUIDV4`.** `DataType.UUIDV4` genera un UUID v4 aleatorio del lado de Node (Sequelize
  igual manda el valor explícito en el INSERT). Si simplemente se quita `@Default`, Sequelize sigue mandando
  la columna `id` con `NULL` explícito en el INSERT (no la omite), lo cual pisa el `DEFAULT` de Postgres y
  viola el `NOT NULL` — por eso hace falta el `Sequelize.literal(...)`, que hace que Sequelize mande la
  *expresión SQL* `uuidv7()` en vez de un valor calculado o `NULL`. Si se pasa un `id` explícito al crear, ese
  valor gana igual.
- **No pasar `idGenerator` al repositorio es la opción por defecto.** `idGenerator` en
  `RepositoryOptionsInterface` es opcional; si no se pasa, `AbstractRepository` no toca el campo `id` y deja
  que el default de la base de datos (definido en `BaseModel`/la migración) se encargue.

## Resumen rápido

- Nunca crear un archivo dentro de `migrations/` o `seeders/` a mano — siempre correr el generador
  (`db:migration:generate` / `db:seed:generate`) y editar el archivo resultante.
- Nunca calcular el timestamp del nombre de archivo a mano.
- Todo `up`/`down` con contenido real va envuelto en `queryInterface.sequelize.transaction()` con
  `commit`/`rollback` explícitos.
- Todo modelo nuevo extiende `BaseModel` salvo que se justifique no tener soft delete; siempre se registra en
  `src/database/models/index.ts`.
- Nunca reimplementar CRUD a mano en un repositorio o servicio de feature — extender `AbstractRepository` /
  `CrudService` y solo agregar los métodos de negocio que no existan ya.
- Antes de dar por buena una migración o un modelo nuevo, correr `bun run db:migrate:status` y, si se puede,
  probar `db:migrate` → `db:migrate:undo` contra una base real para confirmar que el ciclo completo funciona.
