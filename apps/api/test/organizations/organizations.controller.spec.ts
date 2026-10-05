import 'reflect-metadata';
import RoleNameEnum from '@common/enums/role-name.enum';
import PaginationDto from '@common/dto/pagination.dto';
import { IS_PUBLIC_KEY } from '@auth/decorators/public.decorator';
import { AUTH_WITH_PERMISSIONS_KEY } from '@auth/decorators/auth-with-permissions.decorator';
import OrganizationsController from '../../src/organizations/organizations.controller';
import OrganizationsService from '../../src/organizations/organizations.service';
import CreateOrganizationDto from '../../src/organizations/dto/create-organization.dto';
import CreateUserDto from '../../src/users/dto/create-user.dto';

const handlerMetadata = (handler: string, key: string): unknown =>
  Reflect.getMetadata(
    key,
    Object.getOwnPropertyDescriptor(OrganizationsController.prototype, handler)!
      .value as object,
  );

describe('OrganizationsController', () => {
  let organizationsService: {
    registerOrganizationAndOwner: jest.Mock;
    findAllPaginated: jest.Mock;
  };
  let controller: OrganizationsController;

  const organizationDto = {
    name: 'Colegio X',
    slug: 'colegio-x',
  } as CreateOrganizationDto;

  const ownerDto: CreateUserDto = {
    firstName: 'Ana',
    lastName: 'Lopez',
    email: 'ana@example.com',
    roleId: 'admin-role-id',
  };

  beforeEach(() => {
    organizationsService = {
      registerOrganizationAndOwner: jest.fn().mockResolvedValue(undefined),
      findAllPaginated: jest.fn().mockResolvedValue({ rows: [], count: 0 }),
    };
    controller = new OrganizationsController(
      organizationsService as unknown as OrganizationsService,
    );
  });

  describe('route protection', () => {
    it('restricts the whole controller to the SUPER_ADMIN role', () => {
      expect(
        Reflect.getMetadata(AUTH_WITH_PERMISSIONS_KEY, OrganizationsController),
      ).toEqual({
        roles: [RoleNameEnum.SUPER_ADMIN],
        permissions: [],
        mode: 'all',
      });
    });

    it.each(['registerOrganization', 'listOrganizations'])(
      '%s inherits the controller requirement without overriding it',
      (handler) => {
        expect(
          handlerMetadata(handler, AUTH_WITH_PERMISSIONS_KEY),
        ).toBeUndefined();
        expect(handlerMetadata(handler, IS_PUBLIC_KEY)).toBeUndefined();
      },
    );

    it('is not public', () => {
      expect(
        Reflect.getMetadata(IS_PUBLIC_KEY, OrganizationsController),
      ).toBeUndefined();
    });
  });

  describe('registerOrganization', () => {
    it('passes the organization and owner bodies to the service', async () => {
      await controller.registerOrganization(organizationDto, ownerDto);

      expect(
        organizationsService.registerOrganizationAndOwner,
      ).toHaveBeenCalledWith(organizationDto, ownerDto);
    });

    it('propagates service errors', async () => {
      const error = new Error('boom');
      organizationsService.registerOrganizationAndOwner.mockRejectedValue(
        error,
      );

      await expect(
        controller.registerOrganization(organizationDto, ownerDto),
      ).rejects.toBe(error);
    });
  });

  describe('listOrganizations', () => {
    const pagination = Object.assign(new PaginationDto(), {
      page: 2,
      pageSize: 5,
      search: 'colegio',
    });

    it('delegates the pagination query to the service', async () => {
      await expect(controller.listOrganizations(pagination)).resolves.toEqual({
        rows: [],
        count: 0,
      });
      expect(organizationsService.findAllPaginated).toHaveBeenCalledWith(
        pagination,
      );
    });

    it('propagates service errors', async () => {
      const error = new Error('boom');
      organizationsService.findAllPaginated.mockRejectedValue(error);

      await expect(controller.listOrganizations(pagination)).rejects.toBe(
        error,
      );
    });
  });
});
