import { BaseTable } from '@database/types/drizzle.types';
import { RepositoryInterface } from '@database/interfaces/repository.interface';
import PaginationDto from '@common/dto/pagination.dto';
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

export default class CrudService<
  TTable extends BaseTable,
  TRepository extends RepositoryInterface<TTable> = RepositoryInterface<TTable>,
> {
  constructor(protected readonly repository: TRepository) {}

  public create(
    dto: Insert<TTable>,
    options?: TransactionOptions,
  ): Promise<Select<TTable>> {
    return this.repository.create(dto, options);
  }

  public insertMany(
    dtos: Insert<TTable>[],
    options?: TransactionOptions,
  ): Promise<Select<TTable>[]> {
    return this.repository.insertMany(dtos, options);
  }

  public findOrCreate(
    options: FindOrCreateOptions<TTable>,
  ): Promise<[Select<TTable>, boolean]> {
    return this.repository.findOrCreate(options);
  }

  public findByPk(
    primaryKey: string,
    validate: boolean,
    options?: FindOptions,
  ): Promise<Select<TTable> | null> {
    return this.repository.findByPk(primaryKey, validate, options);
  }

  public findOne(
    query: Partial<Select<TTable>>,
    validate: boolean,
    options?: FindOptions,
  ): Promise<Select<TTable> | null> {
    return this.repository.findOne(query, validate, options);
  }

  public findAll(
    query?: Partial<Select<TTable>>,
    options?: ListOptions,
  ): Promise<Select<TTable>[]> {
    return this.repository.findAll(query, options);
  }

  public findAllPaginated(
    dto: PaginationDto,
    query?: Partial<Select<TTable>>,
    options?: FindOptions,
  ): Promise<PaginatedResponseInterface<Select<TTable>>> {
    return this.repository.findAllPaginated(dto, query, options);
  }

  public updateByPk(
    primaryKey: string,
    dto: Partial<Insert<TTable>>,
    options?: TransactionOptions,
  ): Promise<Select<TTable> | null> {
    return this.repository.updateByPk(primaryKey, dto, options);
  }

  public updateByQuery(
    query: Partial<Select<TTable>>,
    dto: Partial<Insert<TTable>>,
    options?: TransactionOptions,
  ): Promise<Select<TTable> | null> {
    return this.repository.updateByQuery(query, dto, options);
  }

  public deleteByPk(
    primaryKey: string,
    options?: DeleteOptions,
  ): Promise<Select<TTable> | null> {
    return this.repository.deleteByPk(primaryKey, options);
  }

  public restoreByPk(
    primaryKey: string,
    options?: TransactionOptions,
  ): Promise<Select<TTable> | null> {
    return this.repository.restoreByPk(primaryKey, options);
  }

  public transaction<R>(
    runInTransaction: Parameters<RepositoryInterface<TTable>['transaction']>[0],
  ): Promise<R> {
    return this.repository.transaction(runInTransaction) as Promise<R>;
  }
}
