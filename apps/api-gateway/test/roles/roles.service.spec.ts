import 'reflect-metadata';
import RolesService from '../../src/roles/roles.service';
import RoleRepository from '../../src/roles/role.repository';

describe('RolesService', () => {
  let repository: { findAll: jest.Mock };
  let service: RolesService;

  const roles = [
    { id: 'role-1', label: 'Admin', labelEs: 'Administrador' },
    { id: 'role-2', label: 'Student', labelEs: 'Estudiante' },
  ];

  beforeEach(() => {
    repository = { findAll: jest.fn().mockResolvedValue(roles) };
    service = new RolesService(repository as unknown as RoleRepository);
  });

  describe('listRoles', () => {
    it('lists every role exposing only id, label and labelEs', async () => {
      await expect(service.listRoles()).resolves.toBe(roles);
      expect(repository.findAll).toHaveBeenCalledWith(undefined, {
        attributes: ['id', 'label', 'labelEs'],
      });
    });
  });
});
