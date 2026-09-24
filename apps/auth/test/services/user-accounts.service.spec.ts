import { AuthService } from '@thallesp/nestjs-better-auth';
import { Auth } from '@common/config/auth.config';
import UserAccountsService from '@services/user-accounts.service';

describe('UserAccountsService', () => {
  const createUser = jest.fn();
  const deleteUser = jest.fn();
  const authService = {
    api: { createUser },
    instance: {
      $context: Promise.resolve({ internalAdapter: { deleteUser } }),
    },
  } as unknown as AuthService<Auth>;
  const service = new UserAccountsService(authService);

  describe('create', () => {
    const dto = { name: 'Ada', email: 'ada@acme.com', password: 'secret123' };

    it('creates the user server-side, without the caller session', async () => {
      createUser.mockResolvedValue({
        user: {
          id: 'user-1',
          name: 'Ada',
          email: 'ada@acme.com',
          role: 'user',
        },
      });

      await service.create(dto);

      // No `headers`: Better Auth treats it as a trusted server call.
      expect(createUser).toHaveBeenCalledWith({ body: dto });
    });

    it('returns only the public account fields', async () => {
      createUser.mockResolvedValue({
        user: {
          id: 'user-1',
          name: 'Ada',
          email: 'ada@acme.com',
          role: 'user',
          banned: false,
        },
      });

      await expect(service.create(dto)).resolves.toEqual({
        id: 'user-1',
        name: 'Ada',
        email: 'ada@acme.com',
      });
    });

    it('propagates Better Auth errors (e.g. email taken)', async () => {
      const error = new Error('User already exists');
      createUser.mockRejectedValue(error);

      await expect(service.create(dto)).rejects.toBe(error);
    });
  });

  describe('remove', () => {
    it('deletes the user through the internal adapter', async () => {
      await service.remove('user-1');

      expect(deleteUser).toHaveBeenCalledWith('user-1');
    });
  });
});
