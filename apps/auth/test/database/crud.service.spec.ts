import 'reflect-metadata';
import CrudService from '@database/services/crud.service';
import { RepositoryInterface } from '@database/interfaces/repository.interface';
import PaginatedResponseInterface from '@database/interfaces/paginated-response.interface';
import PaginationDto from '@common/dto/pagination.dto';
import { DrizzleTx } from '@database/types/drizzle.types';
import { testEntitiesTable, TestEntitySelect } from './fixtures/test-entity.schema';

type MockedRepository = {
  [K in keyof RepositoryInterface<typeof testEntitiesTable>]: jest.Mock;
};

const createRepositoryMock = (): MockedRepository => ({
  create: jest.fn(),
  insertMany: jest.fn(),
  findOrCreate: jest.fn(),
  findByPk: jest.fn(),
  findOne: jest.fn(),
  findAll: jest.fn(),
  findAllPaginated: jest.fn(),
  updateByPk: jest.fn(),
  updateByQuery: jest.fn(),
  deleteByPk: jest.fn(),
  restoreByPk: jest.fn(),
  transaction: jest.fn(),
});

describe('CrudService', () => {
  let repository: MockedRepository;
  let service: CrudService<typeof testEntitiesTable>;

  const entity = { id: 'id-1', name: 'test' } as TestEntitySelect;

  beforeEach(() => {
    repository = createRepositoryMock();
    service = new CrudService<typeof testEntitiesTable>(
      repository as unknown as RepositoryInterface<typeof testEntitiesTable>,
    );
  });

  describe('create', () => {
    it('delegates to the repository and returns its result', async () => {
      const dto = { name: 'test' };
      const options = { transaction: undefined };
      repository.create.mockResolvedValue(entity);

      await expect(service.create(dto, options)).resolves.toBe(entity);
      expect(repository.create).toHaveBeenCalledWith(dto, options);
    });

    it('propagates repository errors', async () => {
      const error = new Error('boom');
      repository.create.mockRejectedValue(error);

      await expect(service.create({ name: 'test' })).rejects.toBe(error);
    });
  });

  describe('insertMany', () => {
    it('delegates to the repository and returns its result', async () => {
      const dtos = [{ name: 'a' }, { name: 'b' }];
      const options = {};
      repository.insertMany.mockResolvedValue([entity, entity]);

      await expect(service.insertMany(dtos, options)).resolves.toEqual([
        entity,
        entity,
      ]);
      expect(repository.insertMany).toHaveBeenCalledWith(dtos, options);
    });
  });

  describe('findOrCreate', () => {
    it('delegates to the repository and returns its result', async () => {
      const options = { where: { name: 'test' } };
      repository.findOrCreate.mockResolvedValue([entity, true]);

      await expect(service.findOrCreate(options)).resolves.toEqual([
        entity,
        true,
      ]);
      expect(repository.findOrCreate).toHaveBeenCalledWith(options);
    });
  });

  describe('findByPk', () => {
    it('delegates to the repository and returns its result', async () => {
      const options = { paranoid: false };
      repository.findByPk.mockResolvedValue(entity);

      await expect(service.findByPk('id-1', true, options)).resolves.toBe(
        entity,
      );
      expect(repository.findByPk).toHaveBeenCalledWith('id-1', true, options);
    });

    it('returns null when the repository finds nothing', async () => {
      repository.findByPk.mockResolvedValue(null);

      await expect(service.findByPk('missing', false)).resolves.toBeNull();
      expect(repository.findByPk).toHaveBeenCalledWith(
        'missing',
        false,
        undefined,
      );
    });
  });

  describe('findOne', () => {
    it('delegates to the repository and returns its result', async () => {
      const query = { name: 'test' };
      const options = { paranoid: false };
      repository.findOne.mockResolvedValue(entity);

      await expect(service.findOne(query, true, options)).resolves.toBe(entity);
      expect(repository.findOne).toHaveBeenCalledWith(query, true, options);
    });
  });

  describe('findAll', () => {
    it('delegates to the repository and returns its result', async () => {
      const query = { name: 'test' };
      const options = { limit: 5 };
      repository.findAll.mockResolvedValue([entity]);

      await expect(service.findAll(query, options)).resolves.toEqual([entity]);
      expect(repository.findAll).toHaveBeenCalledWith(query, options);
    });

    it('works without query or options', async () => {
      repository.findAll.mockResolvedValue([]);

      await expect(service.findAll()).resolves.toEqual([]);
      expect(repository.findAll).toHaveBeenCalledWith(undefined, undefined);
    });
  });

  describe('findAllPaginated', () => {
    it('delegates to the repository and returns its result', async () => {
      const dto = new PaginationDto();
      const query = { name: 'test' };
      const options = { paranoid: false };
      const response: PaginatedResponseInterface<TestEntitySelect> = {
        data: [entity],
        meta: {
          page: 1,
          pageSize: 10,
          total: 1,
          totalPages: 1,
          hasNext: false,
          hasPrev: false,
          nextPage: null,
          prevPage: null,
          from: 1,
          to: 1,
        },
      };
      repository.findAllPaginated.mockResolvedValue(response);

      await expect(service.findAllPaginated(dto, query, options)).resolves.toBe(
        response,
      );
      expect(repository.findAllPaginated).toHaveBeenCalledWith(
        dto,
        query,
        options,
      );
    });
  });

  describe('updateByPk', () => {
    it('delegates to the repository and returns its result', async () => {
      const dto = { name: 'updated' };
      const options = {};
      repository.updateByPk.mockResolvedValue(entity);

      await expect(service.updateByPk('id-1', dto, options)).resolves.toBe(
        entity,
      );
      expect(repository.updateByPk).toHaveBeenCalledWith('id-1', dto, options);
    });
  });

  describe('updateByQuery', () => {
    it('delegates to the repository and returns its result', async () => {
      const query = { name: 'test' };
      const dto = { name: 'updated' };
      const options = {};
      repository.updateByQuery.mockResolvedValue(entity);

      await expect(service.updateByQuery(query, dto, options)).resolves.toBe(
        entity,
      );
      expect(repository.updateByQuery).toHaveBeenCalledWith(
        query,
        dto,
        options,
      );
    });
  });

  describe('deleteByPk', () => {
    it('delegates to the repository and returns its result', async () => {
      const options = { force: true };
      repository.deleteByPk.mockResolvedValue(entity);

      await expect(service.deleteByPk('id-1', options)).resolves.toBe(entity);
      expect(repository.deleteByPk).toHaveBeenCalledWith('id-1', options);
    });
  });

  describe('restoreByPk', () => {
    it('delegates to the repository and returns its result', async () => {
      const options = {};
      repository.restoreByPk.mockResolvedValue(entity);

      await expect(service.restoreByPk('id-1', options)).resolves.toBe(entity);
      expect(repository.restoreByPk).toHaveBeenCalledWith('id-1', options);
    });
  });

  describe('transaction', () => {
    it('delegates the callback to the repository and returns its result', async () => {
      const callback = jest.fn().mockResolvedValue('done');
      repository.transaction.mockImplementation(
        (fn: (t: DrizzleTx) => Promise<unknown>) => fn({} as DrizzleTx),
      );

      await expect(service.transaction(callback)).resolves.toBe('done');
      expect(repository.transaction).toHaveBeenCalledWith(callback);
      expect(callback).toHaveBeenCalledTimes(1);
    });
  });
});
