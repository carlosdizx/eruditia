import { InferInsertModel, InferSelectModel } from 'drizzle-orm';
import { DrizzleTx, BaseTable } from '@database/types/drizzle.types';

export type Select<TTable extends BaseTable> = InferSelectModel<TTable>;
export type Insert<TTable extends BaseTable> = InferInsertModel<TTable>;

export interface TransactionOptions {
  transaction?: DrizzleTx;
}

export interface FindOptions extends TransactionOptions {
  paranoid?: boolean;
}

export interface ListOptions extends FindOptions {
  orderBy?: string;
  orderDirection?: 'ASC' | 'DESC' | 'asc' | 'desc';
  limit?: number;
  offset?: number;
}

export interface DeleteOptions extends TransactionOptions {
  force?: boolean;
}

export interface FindOrCreateOptions<TTable extends BaseTable>
  extends TransactionOptions {
  where: Partial<Select<TTable>>;
  defaults?: Insert<TTable>;
}
