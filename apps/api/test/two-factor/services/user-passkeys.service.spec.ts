import 'reflect-metadata';
import CrudService from '@database/services/crud.service';
import UserPasskeysService from '../../../src/two-factor/services/user-passkeys.service';
import UserPasskeyRepository from '../../../src/two-factor/repositories/user-passkey.repository';

describe('UserPasskeysService', () => {
  let repository: { findAll: jest.Mock };
  let service: UserPasskeysService;

  beforeEach(() => {
    repository = { findAll: jest.fn().mockResolvedValue([{ id: 'passkey' }]) };
    service = new UserPasskeysService(
      repository as unknown as UserPasskeyRepository,
    );
  });

  it('extends CrudService', () => {
    expect(service).toBeInstanceOf(CrudService);
  });

  it('works over the passkey repository', async () => {
    await expect(service.findAll({ userId: 'user-id' })).resolves.toEqual([
      { id: 'passkey' },
    ]);
    expect(repository.findAll).toHaveBeenCalledWith(
      { userId: 'user-id' },
      undefined,
    );
  });
});
