import 'reflect-metadata';
import RolesController from '../../src/roles/roles.controller';
import RolesService from '../../src/roles/roles.service';

describe('RolesController', () => {
  let rolesService: { listRoles: jest.Mock };
  let controller: RolesController;

  beforeEach(() => {
    rolesService = { listRoles: jest.fn() };
    controller = new RolesController(rolesService as unknown as RolesService);
  });

  describe('getRoles', () => {
    it('returns the roles listed by the service', async () => {
      const roles = [
        { id: 'role-1', label: 'Admin', labelEs: 'Administrador' },
      ];
      rolesService.listRoles.mockResolvedValue(roles);

      await expect(controller.getRoles()).resolves.toBe(roles);
      expect(rolesService.listRoles).toHaveBeenCalledTimes(1);
    });
  });
});
