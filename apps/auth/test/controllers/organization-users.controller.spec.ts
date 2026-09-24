import { RequestMethod } from '@nestjs/common';
import {
  GUARDS_METADATA,
  METHOD_METADATA,
  PATH_METADATA,
} from '@nestjs/common/constants';
import RolesGuard from '@auth/guards/roles.guard';
import OrganizationRole from '@auth/enums/organization-role.enum';
import { REQUIRED_ROLES_KEY } from '@auth/constants/auth-metadata.constants';
import OrganizationUsersController from '@controllers/organization-users.controller';
import OrganizationUsersService from '@services/organization-users.service';

const handler = (): object =>
  Object.getOwnPropertyDescriptor(
    OrganizationUsersController.prototype,
    'create',
  )?.value as object;

describe('OrganizationUsersController', () => {
  const organizationUsersService = { create: jest.fn() };
  const controller = new OrganizationUsersController(
    organizationUsersService as unknown as OrganizationUsersService,
  );

  it('is served at POST /organizations/users', () => {
    expect(
      Reflect.getMetadata(PATH_METADATA, OrganizationUsersController),
    ).toBe('organizations/users');
    expect(Reflect.getMetadata(METHOD_METADATA, handler())).toBe(
      RequestMethod.POST,
    );
  });

  it('is only for organization admins', () => {
    expect(Reflect.getMetadata(REQUIRED_ROLES_KEY, handler())).toEqual([
      'admin',
    ]);
    expect(Reflect.getMetadata(GUARDS_METADATA, handler())).toEqual([
      RolesGuard,
    ]);
  });

  it('creates the user in the active organization of the admin', async () => {
    const dto = {
      name: 'Grace',
      email: 'grace@acme.com',
      password: 'secret123',
      role: OrganizationRole.MEMBER,
    };
    const created = { id: 'user-2' };
    organizationUsersService.create.mockResolvedValue(created);

    await expect(controller.create('org-1', dto)).resolves.toBe(created);
    expect(organizationUsersService.create).toHaveBeenCalledWith('org-1', dto);
  });
});
