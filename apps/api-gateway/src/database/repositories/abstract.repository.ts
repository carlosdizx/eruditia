import { ConflictException, Logger, NotFoundException } from '@nestjs/common';
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
  Op,
} from 'sequelize';
import { Model, ModelCtor } from 'sequelize-typescript';
import { setRangeUtil } from '@common/utils/set-range.util';
import { RepositoryInterface } from '@database/interfaces/repository.interface';
import PaginationDto from '@common/dto/pagination.dto';
import PaginatedResponseInterface from '@database/interfaces/paginated-response.interface';
import RepositoryOptionsInterface from '@database/interfaces/repository-options.interface';

export default class AbstractRepository<
  TModel extends Model,
> implements RepositoryInterface<TModel> {
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
    protected readonly model: ModelCtor<TModel>,
    options: RepositoryOptionsInterface<TModel>,
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

  private generateIdObject() {
    if (this.idGenerator) return { id: this.idGenerator() };

    return undefined;
  }

  public unassignLoggerError() {
    this.logger.error = () => {};
  }

  private toClean(entity: TModel): TModel {
    return entity.toJSON() as TModel;
  }

  private toCleanArray(entities: TModel[]): TModel[] {
    return entities.map((entity) => this.toClean(entity) as TModel);
  }

  public async create(
    dto: CreationAttributes<TModel>,
    options?: CreateOptions<Attributes<TModel>>,
  ): Promise<TModel> {
    try {
      const entity = await this.model.create(
        {
          ...dto,
          ...this.generateIdObject(),
        },
        options,
      );
      return this.toClean(entity)!;
    } catch (error) {
      this.logger.error('Error creating entity');
      this.logger.error(error);
      throw new ConflictException(this.createMessage);
    }
  }

  public async insertMany(
    dtos: CreationAttributes<TModel>[],
    options?: BulkCreateOptions<Attributes<TModel>>,
  ): Promise<TModel[]> {
    try {
      const identifiedDtos = dtos.map((dto) => ({
        ...dto,
        ...this.generateIdObject(),
      }));

      const entities = await this.model.bulkCreate(identifiedDtos, options);
      return this.toCleanArray(entities);
    } catch (error) {
      this.logger.error('Error creating entities');
      this.logger.error(error);
      throw new ConflictException(this.insertManyMessage);
    }
  }

  public async findOrCreate(
    options: FindOrCreateOptions<
      Attributes<TModel>,
      CreationAttributes<TModel>
    >,
  ): Promise<[TModel, boolean]> {
    try {
      const modifiedOptions: FindOrCreateOptions<
        Attributes<TModel>,
        CreationAttributes<TModel>
      > = {
        ...options,
        defaults: options.defaults
          ? { ...options.defaults, ...this.generateIdObject() }
          : undefined,
      };

      const [entity, created] = await this.model.findOrCreate(modifiedOptions);
      return [this.toClean(entity)!, created];
    } catch (error) {
      this.logger.error('Error finding or creating entity');
      this.logger.error(error);
      throw new ConflictException(this.findOrCreateMessage);
    }
  }

  public async findByPk(
    primaryKey: string,
    validate: boolean,
    options?: Omit<FindOptions<Attributes<TModel>>, 'where'>,
  ): Promise<TModel | null> {
    let entity: TModel;

    try {
      entity = (await this.model.findByPk(primaryKey, options)) as TModel;
    } catch (error) {
      this.logger.error('Error finding entity by primary key');
      this.logger.error(error);
      throw new ConflictException(this.findByPkMessage);
    }

    if (!entity) {
      if (validate) throw new NotFoundException(this.findByPkNotFoundMessage);
      return null;
    }

    return this.toClean(entity);
  }

  public async findOne(
    query: WhereOptions<Attributes<TModel>>,
    validate: boolean,
    options?: Omit<FindOptions<Attributes<TModel>>, 'where'>,
  ): Promise<TModel | null> {
    let entity: TModel;

    try {
      entity = (await this.model.findOne<TModel>({
        where: query,
        ...options,
      })) as TModel;
    } catch (error) {
      this.logger.error('Error finding entity by query');
      this.logger.error(error);
      throw new ConflictException(this.findOneMessage);
    }

    if (!entity) {
      if (validate) throw new NotFoundException(this.findOneNotFoundMessage);
      return null;
    }

    return this.toClean(entity);
  }

  public async findAll(
    query?: WhereOptions<Attributes<TModel>>,
    options?: Omit<FindOptions<Attributes<TModel>>, 'where'>,
  ): Promise<TModel[]> {
    try {
      const entities = await this.model.findAll({
        where: query,
        ...options,
      });
      return this.toCleanArray(entities);
    } catch (error) {
      this.logger.error('Error finding all entities');
      this.logger.error(error);
      throw new ConflictException(this.findAllMessage);
    }
  }

  public async findAllPaginated(
    dto: PaginationDto,
    query?: WhereOptions<Attributes<TModel>>,
    options?: Omit<
      FindAndCountOptions<Attributes<TModel>>,
      'where' | 'offset' | 'limit'
    >,
  ): Promise<PaginatedResponseInterface<TModel>> {
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
      let finalWhere: WhereOptions<Attributes<TModel>> = query as any;

      if (rangeResult) {
        const existingAnd = ((finalWhere as any)?.[Op.and] || []) as any[];
        finalWhere = {
          ...finalWhere,
          [Op.and]: [
            ...existingAnd,
            {
              [rangeProperty]: {
                [Op.between]: [rangeResult.dateFirst, rangeResult.dateEnd],
              },
            },
          ],
        } as any;
      }

      const order: any = orderBy
        ? [[orderBy, orderDirection || 'ASC']]
        : undefined;

      const { count, rows } = await this.model.findAndCountAll({
        where: finalWhere,
        limit: pageSize,
        offset,
        ...options,
        order: order || options?.order,
      });

      const total = count;
      const totalPages = Math.ceil(total / pageSize);

      const from = offset + 1;
      const to = Math.min(offset + pageSize, total);

      return {
        data: this.toCleanArray(rows),
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
    dto: Partial<Attributes<TModel>>,
    options?: SaveOptions<Attributes<TModel>>,
  ): Promise<TModel | null> {
    try {
      const entity = await this.model.findByPk(primaryKey);

      if (!entity) return null;

      entity.set(dto);
      await entity.save(options);

      return this.toClean(entity);
    } catch (error) {
      this.logger.error('Error updating entity by primary key');
      this.logger.error(error);
      throw new ConflictException(this.updateByPkMessage);
    }
  }

  public async updateByQuery(
    query: WhereOptions<Attributes<TModel>>,
    dto: Partial<Attributes<TModel>>,
    options?: SaveOptions<Attributes<TModel>>,
  ): Promise<TModel | null> {
    await this.findOne(query, true);

    const entity = (await this.model.findOne({ where: query })) as TModel;

    try {
      entity.set(dto);
      await entity.save(options);

      return this.toClean(entity);
    } catch (error) {
      this.logger.error('Error updating entity by query');
      this.logger.error(error);
      throw new ConflictException(this.updateByQueryMessage);
    }
  }

  public async deleteByPk(
    primaryKey: string | number,
    options?: InstanceDestroyOptions,
  ): Promise<TModel | null> {
    try {
      const entity = await this.model.findByPk(primaryKey, {
        paranoid: !options?.force,
      });

      if (!entity) return null;

      await entity.destroy(options);

      return this.toClean(entity);
    } catch (error) {
      this.logger.error('Error deleting entity by primary key');
      this.logger.error(error);
      throw new ConflictException(this.deleteByPkMessage);
    }
  }

  public async restoreByPk(
    primaryKey: string,
    options?: InstanceRestoreOptions,
  ): Promise<TModel | null> {
    try {
      const entity = await this.model.findByPk(primaryKey, {
        paranoid: false,
      });

      if (!entity) return null;

      await entity.restore(options);

      return this.toClean(entity);
    } catch (error) {
      this.logger.error('Error restoring entity by primary key');
      this.logger.error(error);
      throw new ConflictException(this.restoreByPkMessage);
    }
  }

  public async transaction<R>(
    runInTransaction: (transaction: Transaction) => Promise<R>,
  ): Promise<R> {
    return this.model.sequelize!.transaction(async (transaction) => {
      try {
        return await runInTransaction(transaction);
      } catch (error) {
        this.logger.error('Error in transaction');
        this.logger.error(error);
        throw new ConflictException(this.transactionMessage);
      }
    });
  }
}
