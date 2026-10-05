import {
  Attributes,
  BulkCreateOptions,
  CreateOptions,
  CreationAttributes,
  FindAndCountOptions,
  FindOptions,
  FindOrCreateOptions,
  InstanceDestroyOptions,
  InstanceRestoreOptions,
  SaveOptions,
  Transaction,
  WhereOptions,
} from 'sequelize';
import { Model } from 'sequelize-typescript';
import RepositoryInterface from '@database/interfaces/repository.interface';
import PaginationDto from '@common/dto/pagination.dto';
import PaginatedResponseInterface from '@database/interfaces/paginated-response.interface';

export default class CrudService<
  TModel extends Model,
  TRepository extends RepositoryInterface<TModel> = RepositoryInterface<TModel>,
> {
  constructor(protected readonly repository: TRepository) {}

  public create(
    dto: CreationAttributes<TModel>,
    options?: CreateOptions<TModel>,
  ): Promise<TModel> {
    return this.repository.create(dto, options);
  }

  public insertMany(
    dtos: CreationAttributes<TModel>[],
    options?: BulkCreateOptions<Attributes<TModel>>,
  ): Promise<TModel[]> {
    return this.repository.insertMany(dtos, options);
  }

  public findOrCreate(
    options: FindOrCreateOptions<
      Attributes<TModel>,
      CreationAttributes<TModel>
    >,
  ): Promise<[TModel, boolean]> {
    return this.repository.findOrCreate(options);
  }

  public findByPk(
    primaryKey: string | number,
    validate: boolean,
    options?: Omit<FindOptions<Attributes<TModel>>, 'where'>,
  ): Promise<TModel | null> {
    return this.repository.findByPk(primaryKey, validate, options);
  }

  public findOne(
    query: WhereOptions<Attributes<TModel>>,
    validate: boolean,
    options?: Omit<FindOptions<Attributes<TModel>>, 'where'>,
  ): Promise<TModel | null> {
    return this.repository.findOne(query, validate, options);
  }

  public findAll(
    query?: WhereOptions<Attributes<TModel>>,
    options?: Omit<FindOptions<Attributes<TModel>>, 'where'>,
  ): Promise<TModel[]> {
    return this.repository.findAll(query, options);
  }

  public findAllPaginated(
    dto: PaginationDto,
    query?: WhereOptions<Attributes<TModel>>,
    options?: Omit<
      FindAndCountOptions<Attributes<TModel>>,
      'where' | 'offset' | 'limit'
    >,
  ): Promise<PaginatedResponseInterface<TModel>> {
    return this.repository.findAllPaginated(dto, query, options);
  }

  public updateByPk(
    primaryKey: string | number,
    dto: Partial<Attributes<TModel>>,
    options?: SaveOptions<Attributes<TModel>>,
  ): Promise<TModel | null> {
    return this.repository.updateByPk(primaryKey, dto, options);
  }

  public updateByQuery(
    query: WhereOptions<Attributes<TModel>>,
    dto: Partial<Attributes<TModel>>,
    options?: SaveOptions<Attributes<TModel>>,
  ): Promise<TModel | null> {
    return this.repository.updateByQuery(query, dto, options);
  }

  public deleteByPk(
    primaryKey: string | number,
    options?: InstanceDestroyOptions,
  ): Promise<TModel | null> {
    return this.repository.deleteByPk(primaryKey, options);
  }

  public restoreByPk(
    primaryKey: string | number,
    options?: InstanceRestoreOptions,
  ): Promise<TModel | null> {
    return this.repository.restoreByPk(primaryKey, options);
  }

  public transaction<R>(
    runInTransaction: (transaction: Transaction) => Promise<R>,
  ): Promise<R> {
    return this.repository.transaction(runInTransaction);
  }
}
