import { ConflictException, Logger, NotFoundException } from '@nestjs/common';
import {
  and,
  asc,
  between,
  count,
  desc,
  eq,
  getTableColumns,
  isNull,
  SQL,
} from 'drizzle-orm';
import { PgColumn, PgTable } from 'drizzle-orm/pg-core';
import { setRangeUtil } from '@common/utils/set-range.util';
import PaginationDto from '@common/dto/pagination.dto';
import { RepositoryInterface } from '@database/interfaces/repository.interface';
import RepositoryOptionsInterface from '@database/interfaces/repository-options.interface';
import PaginatedResponseInterface from '@database/interfaces/paginated-response.interface';
import {
  DeleteOptions,
  FindOptions,
  FindOrCreateOptions,
  Insert,
  ListOptions,
  Select,
  TransactionOptions,
} from '@database/interfaces/query-options.interface';
import { BaseTable, DrizzleDb, DrizzleTx } from '@database/types/drizzle.types';

export default class AbstractRepository<TTable extends BaseTable>
  implements RepositoryInterface<TTable>
{
  protected readonly logger: Logger;
  protected readonly idGenerator?: () => string;

  protected readonly createMessage: string;
  protected readonly insertManyMessage: string;
  protected readonly findOrCreateMessage: string;
  protected readonly findByPkMessage: string;
  protected readonly findByPkNotFoundMessage: string;
  protected readonly findOneMessage: string;
  protected readonly findOneNotFoundMessage: string;
  protected readonly findAllMessage: string;
  protected readonly findAllPaginatedMessage: string;
  protected readonly updateByPkMessage: string;
  protected readonly updateByQueryMessage: string;
  protected readonly deleteByPkMessage: string;
  protected readonly restoreByPkMessage: string;
  protected readonly transactionMessage: string;

  constructor(
    protected readonly db: DrizzleDb,
    protected readonly table: TTable,
    options: RepositoryOptionsInterface = {},
  ) {
    const {
      logger = new Logger(this.constructor.name),
      idGenerator,
      createMessage = 'No se pudo crear el registro',
      insertManyMessage = 'No se pudieron crear los registros',
      findOrCreateMessage = 'No se pudo buscar o crear el registro',
      findByPkMessage = 'No se pudo buscar el registro',
      findByPkNotFoundMessage = 'Registro no encontrado',
      findOneMessage = 'No se pudo buscar el registro',
      findOneNotFoundMessage = 'Registro no encontrado',
      findAllMessage = 'No se pudieron listar los registros',
      findAllPaginatedMessage = 'No se pudieron listar los registros',
      updateByPkMessage = 'No se pudo actualizar el registro',
      updateByQueryMessage = 'No se pudo actualizar el registro',
      deleteByPkMessage = 'No se pudo eliminar el registro',
      restoreByPkMessage = 'No se pudo restaurar el registro',
      transactionMessage = 'No se pudo completar la transacción',
    } = options;

    if (new.target === AbstractRepository)
      throw new ConflictException(
        'AbstractRepository cannot be instantiated directly',
      );

    this.logger = logger;
    this.idGenerator = idGenerator;
    this.createMessage = createMessage;
    this.insertManyMessage = insertManyMessage;
    this.findOrCreateMessage = findOrCreateMessage;
    this.findByPkMessage = findByPkMessage;
    this.findByPkNotFoundMessage = findByPkNotFoundMessage;
    this.findOneMessage = findOneMessage;
    this.findOneNotFoundMessage = findOneNotFoundMessage;
    this.findAllMessage = findAllMessage;
    this.findAllPaginatedMessage = findAllPaginatedMessage;
    this.updateByPkMessage = updateByPkMessage;
    this.updateByQueryMessage = updateByQueryMessage;
    this.deleteByPkMessage = deleteByPkMessage;
    this.restoreByPkMessage = restoreByPkMessage;
    this.transactionMessage = transactionMessage;
  }

  private generateIdObject(): Record<string, unknown> | undefined {
    if (this.idGenerator) return { id: this.idGenerator() };

    return undefined;
  }

  public unassignLoggerError() {
    this.logger.error = () => {};
  }

  private executor(transaction?: DrizzleTx): DrizzleDb | DrizzleTx {
    return transaction ?? this.db;
  }

  // `.from()`'s overloads don't resolve cleanly against a generic TTable
  // (it tries to detect data-modifying subqueries); every call site drops
  // to the untyped PgTable shape here and relies on the Select<TTable>
  // casts applied to the query results instead.
  private tableRef(): PgTable {
    return this.table as unknown as PgTable;
  }

  // Resolves a string field name (JS property like `createdAt`, or the raw
  // DB column name like `created_at`) to its Drizzle column object.
  private resolveColumn(key: string): PgColumn {
    const columns = getTableColumns(this.table) as Record<string, PgColumn>;

    if (columns[key]) return columns[key];

    const found = Object.values(columns).find((column) => column.name === key);
    if (!found) throw new Error(`Unknown column: ${key}`);

    return found;
  }

  private paranoidClause(paranoid: boolean): SQL | undefined {
    return paranoid ? isNull(this.table.deletedAt) : undefined;
  }

  private buildWhere(
    query: Partial<Select<TTable>> | undefined,
    paranoid: boolean,
  ): SQL | undefined {
    const equalities = query
      ? Object.entries(query)
          .filter(([, value]) => value !== undefined)
          .map(([key, value]) => eq(this.resolveColumn(key), value as never))
      : [];

    return and(...equalities, this.paranoidClause(paranoid));
  }

  public async create(
    dto: Insert<TTable>,
    options?: TransactionOptions,
  ): Promise<Select<TTable>> {
    try {
      const [entity] = await this.executor(options?.transaction)
        .insert(this.table)
        .values({ ...dto, ...this.generateIdObject() } as never)
        .returning();

      return entity as Select<TTable>;
    } catch (error) {
      this.logger.error('Error creating entity');
      this.logger.error(error);
      throw new ConflictException(this.createMessage);
    }
  }

  public async insertMany(
    dtos: Insert<TTable>[],
    options?: TransactionOptions,
  ): Promise<Select<TTable>[]> {
    try {
      const identifiedDtos = dtos.map((dto) => ({
        ...dto,
        ...this.generateIdObject(),
      }));

      const entities = await this.executor(options?.transaction)
        .insert(this.table)
        .values(identifiedDtos as never[])
        .returning();

      return entities as Select<TTable>[];
    } catch (error) {
      this.logger.error('Error creating entities');
      this.logger.error(error);
      throw new ConflictException(this.insertManyMessage);
    }
  }

  public async findOrCreate(
    options: FindOrCreateOptions<TTable>,
  ): Promise<[Select<TTable>, boolean]> {
    try {
      if (!options.where || Object.keys(options.where).length === 0)
        throw new Error('findOrCreate requires a where clause');

      const executor = this.executor(options.transaction);

      const existing = await executor
        .select()
        .from(this.tableRef())
        .where(this.buildWhere(options.where, false))
        .limit(1);

      if (existing[0]) return [existing[0] as Select<TTable>, false];

      const [created] = await executor
        .insert(this.table)
        .values({
          ...options.where,
          ...options.defaults,
          ...this.generateIdObject(),
        } as never)
        .returning();

      return [created as Select<TTable>, true];
    } catch (error) {
      this.logger.error('Error finding or creating entity');
      this.logger.error(error);
      throw new ConflictException(this.findOrCreateMessage);
    }
  }

  public async findByPk(
    primaryKey: string,
    validate: boolean,
    options?: FindOptions,
  ): Promise<Select<TTable> | null> {
    let rows: Select<TTable>[];

    try {
      const where = and(
        eq(this.table.id, primaryKey),
        this.paranoidClause(options?.paranoid ?? true),
      );

      rows = (await this.executor(options?.transaction)
        .select()
        .from(this.tableRef())
        .where(where)
        .limit(1)) as Select<TTable>[];
    } catch (error) {
      this.logger.error('Error finding entity by primary key');
      this.logger.error(error);
      throw new ConflictException(this.findByPkMessage);
    }

    const entity = rows[0] ?? null;

    if (!entity) {
      if (validate) throw new NotFoundException(this.findByPkNotFoundMessage);
      return null;
    }

    return entity;
  }

  public async findOne(
    query: Partial<Select<TTable>>,
    validate: boolean,
    options?: FindOptions,
  ): Promise<Select<TTable> | null> {
    let rows: Select<TTable>[];

    try {
      rows = (await this.executor(options?.transaction)
        .select()
        .from(this.tableRef())
        .where(this.buildWhere(query, options?.paranoid ?? true))
        .limit(1)) as Select<TTable>[];
    } catch (error) {
      this.logger.error('Error finding entity by query');
      this.logger.error(error);
      throw new ConflictException(this.findOneMessage);
    }

    const entity = rows[0] ?? null;

    if (!entity) {
      if (validate) throw new NotFoundException(this.findOneNotFoundMessage);
      return null;
    }

    return entity;
  }

  public async findAll(
    query?: Partial<Select<TTable>>,
    options?: ListOptions,
  ): Promise<Select<TTable>[]> {
    try {
      const executor = this.executor(options?.transaction);

      let builder = executor
        .select()
        .from(this.tableRef())
        .where(this.buildWhere(query, options?.paranoid ?? true)) as any;

      if (options?.orderBy) {
        const column = this.resolveColumn(options.orderBy);
        const isDesc = (options.orderDirection ?? 'ASC').toUpperCase() === 'DESC';
        builder = builder.orderBy(isDesc ? desc(column) : asc(column));
      }

      if (options?.limit !== undefined) builder = builder.limit(options.limit);
      if (options?.offset !== undefined) builder = builder.offset(options.offset);

      return (await builder) as Select<TTable>[];
    } catch (error) {
      this.logger.error('Error finding all entities');
      this.logger.error(error);
      throw new ConflictException(this.findAllMessage);
    }
  }

  public async findAllPaginated(
    dto: PaginationDto,
    query?: Partial<Select<TTable>>,
    options?: FindOptions,
  ): Promise<PaginatedResponseInterface<Select<TTable>>> {
    const {
      page,
      pageSize,
      range,
      dateFirst,
      dateEnd,
      rangeProperty = 'created_at',
      orderBy,
      orderDirection,
    } = dto;
    const offset = (page - 1) * pageSize;

    const rangeResult = setRangeUtil(range, dateFirst, dateEnd);

    try {
      const executor = this.executor(options?.transaction);
      const clauses: SQL[] = [];

      const baseWhere = this.buildWhere(query, options?.paranoid ?? true);
      if (baseWhere) clauses.push(baseWhere);

      if (rangeResult) {
        const rangeColumn = this.resolveColumn(rangeProperty);
        clauses.push(
          between(rangeColumn, rangeResult.dateFirst, rangeResult.dateEnd),
        );
      }

      const finalWhere = clauses.length ? and(...clauses) : undefined;

      let dataQuery = executor
        .select()
        .from(this.tableRef())
        .where(finalWhere)
        .limit(pageSize)
        .offset(offset) as any;

      if (orderBy) {
        const column = this.resolveColumn(orderBy);
        const isDesc = (orderDirection ?? 'ASC').toString().toUpperCase() === 'DESC';
        dataQuery = dataQuery.orderBy(isDesc ? desc(column) : asc(column));
      }

      const [rows, countRows] = await Promise.all([
        dataQuery,
        executor.select({ value: count() }).from(this.tableRef()).where(finalWhere),
      ]);

      const total = countRows[0]?.value ?? 0;
      const totalPages = Math.ceil(total / pageSize);

      const from = offset + 1;
      const to = Math.min(offset + pageSize, total);

      return {
        data: rows as Select<TTable>[],
        meta: {
          page,
          pageSize,
          total,
          totalPages,
          hasNext: page < totalPages,
          hasPrev: page > 1,
          nextPage: page < totalPages ? page + 1 : null,
          prevPage: page > 1 ? page - 1 : null,
          from,
          to,
        },
      };
    } catch (error) {
      this.logger.error('Error finding paginated entities');
      this.logger.error(error);
      throw new ConflictException(this.findAllPaginatedMessage);
    }
  }

  public async updateByPk(
    primaryKey: string,
    dto: Partial<Insert<TTable>>,
    options?: TransactionOptions,
  ): Promise<Select<TTable> | null> {
    try {
      const where = and(
        eq(this.table.id, primaryKey),
        this.paranoidClause(true),
      );

      const [entity] = await this.executor(options?.transaction)
        .update(this.tableRef())
        .set(dto as never)
        .where(where)
        .returning();

      return (entity as Select<TTable>) ?? null;
    } catch (error) {
      this.logger.error('Error updating entity by primary key');
      this.logger.error(error);
      throw new ConflictException(this.updateByPkMessage);
    }
  }

  public async updateByQuery(
    query: Partial<Select<TTable>>,
    dto: Partial<Insert<TTable>>,
    options?: TransactionOptions,
  ): Promise<Select<TTable> | null> {
    const found = (await this.findOne(query, true, {
      transaction: options?.transaction,
    })) as (Select<TTable> & { id: string }) | null;

    try {
      const [entity] = await this.executor(options?.transaction)
        .update(this.tableRef())
        .set(dto as never)
        .where(eq(this.table.id, found!.id))
        .returning();

      return (entity as Select<TTable>) ?? null;
    } catch (error) {
      this.logger.error('Error updating entity by query');
      this.logger.error(error);
      throw new ConflictException(this.updateByQueryMessage);
    }
  }

  public async deleteByPk(
    primaryKey: string,
    options?: DeleteOptions,
  ): Promise<Select<TTable> | null> {
    try {
      const executor = this.executor(options?.transaction);
      const paranoid = !options?.force;

      const existing = await executor
        .select()
        .from(this.tableRef())
        .where(and(eq(this.table.id, primaryKey), this.paranoidClause(paranoid)))
        .limit(1);

      if (!existing[0]) return null;

      if (options?.force) {
        const [entity] = await executor
          .delete(this.tableRef())
          .where(eq(this.table.id, primaryKey))
          .returning();

        return (entity as Select<TTable>) ?? null;
      }

      const [entity] = await executor
        .update(this.tableRef())
        .set({ deletedAt: new Date() } as never)
        .where(eq(this.table.id, primaryKey))
        .returning();

      return (entity as Select<TTable>) ?? null;
    } catch (error) {
      this.logger.error('Error deleting entity by primary key');
      this.logger.error(error);
      throw new ConflictException(this.deleteByPkMessage);
    }
  }

  public async restoreByPk(
    primaryKey: string,
    options?: TransactionOptions,
  ): Promise<Select<TTable> | null> {
    try {
      const executor = this.executor(options?.transaction);

      const existing = await executor
        .select()
        .from(this.tableRef())
        .where(eq(this.table.id, primaryKey))
        .limit(1);

      if (!existing[0]) return null;

      const [entity] = await executor
        .update(this.tableRef())
        .set({ deletedAt: null } as never)
        .where(eq(this.table.id, primaryKey))
        .returning();

      return (entity as Select<TTable>) ?? null;
    } catch (error) {
      this.logger.error('Error restoring entity by primary key');
      this.logger.error(error);
      throw new ConflictException(this.restoreByPkMessage);
    }
  }

  public async transaction<R>(
    runInTransaction: (transaction: DrizzleTx) => Promise<R>,
  ): Promise<R> {
    try {
      return await this.db.transaction((tx) => runInTransaction(tx));
    } catch (error) {
      this.logger.error('Error in transaction');
      this.logger.error(error);
      throw new ConflictException(this.transactionMessage);
    }
  }
}
