import 'reflect-metadata';
import UsersController from '../../src/users/users.controller';
import UsersService from '../../src/users/users.service';

describe('UsersController', () => {
  let usersService: { createSuperAdmin: jest.Mock };
  let controller: UsersController;

  beforeEach(() => {
    usersService = {
      createSuperAdmin: jest.fn().mockResolvedValue(undefined),
    };
    controller = new UsersController(usersService as unknown as UsersService);
  });

  describe('createSuperAdmin', () => {
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
});
