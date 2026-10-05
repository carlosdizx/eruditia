import 'reflect-metadata';
import PermissionEnum from '@common/enums/permission.enum';
import RoleNameEnum from '@common/enums/role-name.enum';
import PaginationDto from '@common/dto/pagination.dto';
import { IS_PUBLIC_KEY } from '@auth/decorators/public.decorator';
import { AUTH_WITH_PERMISSIONS_KEY } from '@auth/decorators/auth-with-permissions.decorator';
import UsersController from '../../src/users/users.controller';
import UsersService from '../../src/users/users.service';
import authContextFixture from '../auth/fixtures/auth-context.fixture';

const handlerMetadata = (handler: string, key: string): unknown =>
  Reflect.getMetadata(
    key,
    Object.getOwnPropertyDescriptor(UsersController.prototype, handler)!
      .value as object,
  );

describe('UsersController', () => {
  let usersService: {
    createSuperAdmin: jest.Mock;
    findAllPaginated: jest.Mock;
  };
  let controller: UsersController;

  beforeEach(() => {
    usersService = {
      createSuperAdmin: jest.fn().mockResolvedValue(undefined),
      findAllPaginated: jest.fn().mockResolvedValue({ rows: [], count: 0 }),
    };
    controller = new UsersController(usersService as unknown as UsersService);
  });

  describe('createSuperAdmin', () => {
    it('is public', () => {
      expect(handlerMetadata('createSuperAdmin', IS_PUBLIC_KEY)).toBe(true);
    });

    it('delegates to UsersService.createSuperAdmin', async () => {
      await expect(controller.createSuperAdmin()).resolves.toBeUndefined();
      expect(usersService.createSuperAdmin).toHaveBeenCalledTimes(1);
    });

    it('propagates service errors', async () => {
      const error = new Error('boom');
      usersService.createSuperAdmin.mockRejectedValue(error);

      await expect(controller.createSuperAdmin()).rejects.toBe(error);
    });
  });

  describe('listUsers', () => {
    const auth = authContextFixture();
    const pagination = Object.assign(new PaginationDto(), {
      page: 2,
      pageSize: 5,
      search: 'ana',
    });

    it('requires the ADMIN role and the user:list permission', () => {
      expect(handlerMetadata('listUsers', AUTH_WITH_PERMISSIONS_KEY)).toEqual({
        roles: [RoleNameEnum.ADMIN],
        permissions: [PermissionEnum.USER_LIST],
        mode: 'all',
      });
      expect(handlerMetadata('listUsers', IS_PUBLIC_KEY)).toBeUndefined();
    });

    it('lists only the users of the current organization with public attributes', async () => {
      await expect(controller.listUsers(pagination, auth)).resolves.toEqual({
        rows: [],
        count: 0,
      });
      expect(usersService.findAllPaginated).toHaveBeenCalledWith(
        pagination,
        { organizationId: 'org-id' },
        { attributes: ['id', 'firstName', 'lastName', 'email', 'isActive'] },
      );
    });

    it('propagates service errors', async () => {
      const error = new Error('boom');
      usersService.findAllPaginated.mockRejectedValue(error);

      await expect(controller.listUsers(pagination, auth)).rejects.toBe(error);
    });
  });
});
