import { BaseTable, DrizzleTx } from '@database/types/drizzle.types';
import PaginationDto from '../../common/dto/pagination.dto';
import PaginatedResponseInterface from './paginated-response.interface';
import {
  DeleteOptions,
  FindOptions,
  FindOrCreateOptions,
  Insert,
  ListOptions,
  Select,
  TransactionOptions,
} from './query-options.interface';

export interface RepositoryInterface<TTable extends BaseTable> {
  create(
    dto: Insert<TTable>,
    options?: TransactionOptions,
  ): Promise<Select<TTable>>;

  insertMany(
    dtos: Insert<TTable>[],
    options?: TransactionOptions,
  ): Promise<Select<TTable>[]>;

  findOrCreate(
    options: FindOrCreateOptions<TTable>,
  ): Promise<[Select<TTable>, boolean]>;

  findByPk(
    primaryKey: string,
    validate: boolean,
    options?: FindOptions,
  ): Promise<Select<TTable> | null>;

  findOne(
    query: Partial<Select<TTable>>,
    validate: boolean,
    options?: FindOptions,
  ): Promise<Select<TTable> | null>;

  findAll(
    query?: Partial<Select<TTable>>,
    options?: ListOptions,
  ): Promise<Select<TTable>[]>;

  findAllPaginated(
    dto: PaginationDto,
    query?: Partial<Select<TTable>>,
    options?: FindOptions,
  ): Promise<PaginatedResponseInterface<Select<TTable>>>;

  updateByPk(
    primaryKey: string,
    dto: Partial<Insert<TTable>>,
    options?: TransactionOptions,
  ): Promise<Select<TTable> | null>;

  updateByQuery(
    query: Partial<Select<TTable>>,
    dto: Partial<Insert<TTable>>,
    options?: TransactionOptions,
  ): Promise<Select<TTable> | null>;

  deleteByPk(
    primaryKey: string,
    options?: DeleteOptions,
  ): Promise<Select<TTable> | null>;

  restoreByPk(
    primaryKey: string,
    options?: TransactionOptions,
  ): Promise<Select<TTable> | null>;

  transaction<R>(
    runInTransaction: (transaction: DrizzleTx) => Promise<R>,
  ): Promise<R>;
}
