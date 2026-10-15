jest.mock('../../src/students/utils/access-pin.util', () => ({
  generateAccessPin: jest.fn(),
}));

import 'reflect-metadata';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { Transaction } from 'sequelize';
import RoleNameEnum from '@common/enums/role-name.enum';
import StudentAccessService from '../../src/students/student-access.service';
import StudentRepository from '../../src/students/student.repository';
import UsersService from '../../src/users/users.service';
import RolesService from '../../src/roles/roles.service';
import { generateAccessPin } from '../../src/students/utils/access-pin.util';
import { STUDENT_USER_INCLUDE } from '../../src/students/utils/public-student.util';
import {
  ACCOUNT_ALREADY_LINKED_MESSAGE,
  ACCOUNT_EMAIL_IN_USE_MESSAGE,
  HAS_ACCOUNT_MESSAGE,
  NO_ACCOUNT_MESSAGE,
} from '../../src/students/constants/student-messages.constant';

describe('StudentAccessService', () => {
  let repository: {
    findOne: jest.Mock;
    findByPk: jest.Mock;
    updateByPk: jest.Mock;
    transaction: jest.Mock;
  };
  let usersService: {
    findOne: jest.Mock;
    createUser: jest.Mock;
    updateByPk: jest.Mock;
  };
  let rolesService: { findOne: jest.Mock };
  let service: StudentAccessService;

  const transaction = { id: 'tx' } as unknown as Transaction;
  const actor = { organizationId: 'org-id' };
  const owner = { firstName: 'Sofía', lastName: 'Pérez' };

  const student = (overrides: Record<string, unknown> = {}) => ({
    id: 'student-id',
    organizationId: 'org-id',
    userId: null,
    user: null,
    ...owner,
    ...overrides,
  });

  const withAccount = () =>
    student({
      userId: 'user-id',
      user: { id: 'user-id', email: 'sofia@example.com', isActive: true },
    });

  // findOne responde al estudiante objetivo; la búsqueda por userId (cuenta
  // ya vinculada) no encuentra nada salvo que se indique.
  const mockStudent = (target: ReturnType<typeof student>, linked = null) =>
    repository.findOne.mockImplementation((query: { id?: string }) =>
      Promise.resolve(query.id ? target : linked),
    );

  beforeEach(() => {
    repository = {
      findOne: jest.fn(),
      findByPk: jest.fn().mockResolvedValue({
        ...withAccount(),
        accessPin: null,
      }),
      updateByPk: jest.fn().mockResolvedValue({}),
      transaction: jest.fn((run: (tx: Transaction) => unknown) =>
        run(transaction),
      ),
    };
    usersService = {
      findOne: jest.fn().mockResolvedValue(null),
      createUser: jest
        .fn()
        .mockResolvedValue({ id: 'new-user-id', email: 'sofia@example.com' }),
      updateByPk: jest.fn().mockResolvedValue({}),
    };
    rolesService = {
      findOne: jest.fn().mockResolvedValue({ id: 'student-role-id' }),
    };
    jest
      .mocked(generateAccessPin)
      .mockReset()
      .mockResolvedValue({ accessPin: '012345', accessPinHash: 'pin-hash' });

    service = new StudentAccessService(
      repository as unknown as StudentRepository,
      usersService as unknown as UsersService,
      rolesService as unknown as RolesService,
    );
  });

  describe('provideAccount', () => {
    it('creates a STUDENT user in the organization when the email is free', async () => {
      await expect(
        service.provideAccount(
          'org-id',
          'sofia@example.com',
          owner,
          transaction,
        ),
      ).resolves.toEqual({ id: 'new-user-id', email: 'sofia@example.com' });

      expect(rolesService.findOne).toHaveBeenCalledWith(
        { name: RoleNameEnum.STUDENT },
        true,
        { attributes: ['id'], transaction },
      );
      expect(usersService.createUser).toHaveBeenCalledWith(
        {
          ...owner,
          email: 'sofia@example.com',
          roleId: 'student-role-id',
          organizationId: 'org-id',
        },
        transaction,
      );
    });

    it('links a free student account of the same organization and reactivates it', async () => {
      const existing = {
        id: 'user-id',
        organizationId: 'org-id',
        roleId: 'student-role-id',
        isActive: false,
      };
      usersService.findOne.mockResolvedValue(existing);
      repository.findOne.mockResolvedValue(null);

      await expect(
        service.provideAccount(
          'org-id',
          'sofia@example.com',
          owner,
          transaction,
        ),
      ).resolves.toBe(existing);

      expect(usersService.createUser).not.toHaveBeenCalled();
      expect(repository.findOne).toHaveBeenCalledWith(
        { userId: 'user-id' },
        false,
        { attributes: ['id'], transaction },
      );
      expect(usersService.updateByPk).toHaveBeenCalledWith(
        'user-id',
        { isActive: true },
        { transaction },
      );
    });

    it.each([
      ['another organization', { organizationId: 'other-org' }],
      ['a non student role', { roleId: 'teacher-role-id' }],
    ])('rejects an email of %s', async (_, overrides) => {
      usersService.findOne.mockResolvedValue({
        id: 'user-id',
        organizationId: 'org-id',
        roleId: 'student-role-id',
        isActive: true,
        ...overrides,
      });

      await expect(
        service.provideAccount('org-id', 'x@example.com', owner, transaction),
      ).rejects.toThrow(ACCOUNT_EMAIL_IN_USE_MESSAGE);
    });

    it('rejects an account already linked to another student', async () => {
      usersService.findOne.mockResolvedValue({
        id: 'user-id',
        organizationId: 'org-id',
        roleId: 'student-role-id',
        isActive: true,
      });
      repository.findOne.mockResolvedValue({ id: 'other-student' });

      await expect(
        service.provideAccount('org-id', 'x@example.com', owner, transaction),
      ).rejects.toThrow(ACCOUNT_ALREADY_LINKED_MESSAGE);
    });
  });

  describe('linkAccount', () => {
    it('links the account, clears the PIN and returns the student', async () => {
      mockStudent(student());

      const result = await service.linkAccount(
        actor,
        'student-id',
        'sofia@example.com',
      );

      expect(repository.findOne).toHaveBeenCalledWith(
        { id: 'student-id', organizationId: 'org-id' },
        true,
        expect.objectContaining({ include: STUDENT_USER_INCLUDE, transaction }),
      );
      expect(usersService.createUser).toHaveBeenCalled();
      expect(repository.updateByPk).toHaveBeenCalledWith(
        'student-id',
        { userId: 'new-user-id', accessPin: null },
        { transaction },
      );
      expect(result).toMatchObject({ id: 'student-id', hasAccessPin: false });
      expect(result).not.toHaveProperty('accessPin');
    });

    it('rejects a student that already has an account', async () => {
      mockStudent(withAccount());

      await expect(
        service.linkAccount(actor, 'student-id', 'otra@example.com'),
      ).rejects.toThrow(HAS_ACCOUNT_MESSAGE);
      expect(repository.updateByPk).not.toHaveBeenCalled();
    });

    it('returns 404 for a student of another organization', async () => {
      repository.findOne.mockRejectedValue(new NotFoundException());

      await expect(
        service.linkAccount(actor, 'student-id', 'sofia@example.com'),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('unlinkAccount', () => {
    it('deactivates the account and switches the student to a new PIN', async () => {
      mockStudent(withAccount());

      await expect(service.unlinkAccount(actor, 'student-id')).resolves.toEqual(
        { accessPin: '012345' },
      );

      expect(usersService.updateByPk).toHaveBeenCalledWith(
        'user-id',
        { isActive: false },
        { transaction },
      );
      expect(repository.updateByPk).toHaveBeenCalledWith(
        'student-id',
        { userId: null, accessPin: 'pin-hash' },
        { transaction },
      );
    });

    it('rejects a student without account', async () => {
      mockStudent(student());

      await expect(service.unlinkAccount(actor, 'student-id')).rejects.toThrow(
        NO_ACCOUNT_MESSAGE,
      );
      expect(usersService.updateByPk).not.toHaveBeenCalled();
    });
  });

  describe('regenerateAccessPin', () => {
    it('stores the hash of a new PIN and returns it in plain text', async () => {
      mockStudent(student());

      await expect(
        service.regenerateAccessPin(actor, 'student-id'),
      ).resolves.toEqual({ accessPin: '012345' });
      expect(repository.updateByPk).toHaveBeenCalledWith('student-id', {
        userId: null,
        accessPin: 'pin-hash',
      });
    });

    it('treats a link to a deleted user as no account', async () => {
      mockStudent(student({ userId: 'deleted-user-id', user: null }));

      await expect(
        service.regenerateAccessPin(actor, 'student-id'),
      ).resolves.toEqual({ accessPin: '012345' });
    });

    it('rejects a student with an account', async () => {
      mockStudent(withAccount());

      await expect(
        service.regenerateAccessPin(actor, 'student-id'),
      ).rejects.toBeInstanceOf(ConflictException);
      expect(repository.updateByPk).not.toHaveBeenCalled();
    });
  });
});
