jest.mock('@common/utils/password.util', () => ({
  generateFriendlyPassword: jest.fn(),
  hashPassword: jest.fn(),
}));

import 'reflect-metadata';
import { ConflictException, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Transaction } from 'sequelize';
import UsersService from '../../src/users/users.service';
import UserRepository from '../../src/users/user.repository';
import RolesService from '../../src/roles/roles.service';
import CreateUserDto from '../../src/users/dto/create-user.dto';
import RoleNameEnum from '@common/enums/role-name.enum';
import UserStatusEnum from '@common/enums/user-status.enum';
import Env from '@common/schemas/env.schema';
import {
  generateFriendlyPassword,
  hashPassword,
} from '@common/utils/password.util';

const mockedGenerateFriendlyPassword = jest.mocked(generateFriendlyPassword);
const mockedHashPassword = jest.mocked(hashPassword);

describe('UsersService', () => {
  let repository: {
    findOne: jest.Mock;
    create: jest.Mock;
    transaction: jest.Mock;
  };
  let rolesService: { findOne: jest.Mock };
  let configService: { get: jest.Mock };
  let service: UsersService;

  const transaction = { id: 'tx' } as unknown as Transaction;

  const dto: CreateUserDto = {
    firstName: 'Ana',
    lastName: 'Lopez',
    email: 'ana@example.com',
    roleId: 'role-id',
  };

  const createdUser = {
    id: 'user-id',
    ...dto,
    password: 'hashed-password',
  };

  beforeEach(() => {
    jest.spyOn(Logger.prototype, 'verbose').mockImplementation(() => {});

    repository = {
      findOne: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockResolvedValue(createdUser),
      transaction: jest.fn((run: (tx: Transaction) => unknown) =>
        run(transaction),
      ),
    };
    rolesService = { findOne: jest.fn() };
    configService = { get: jest.fn() };

    mockedGenerateFriendlyPassword.mockReturnValue('abcd-efgh-ijkl');
    mockedHashPassword.mockResolvedValue('hashed-password');

    service = new UsersService(
      repository as unknown as UserRepository,
      rolesService as unknown as RolesService,
      configService as unknown as ConfigService<Env, true>,
    );
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('createUser', () => {
    it('looks up the email inside the given transaction', async () => {
      await service.createUser(dto, transaction);

      expect(repository.findOne).toHaveBeenCalledWith(
        { email: dto.email },
        false,
        { attributes: ['id'], transaction },
      );
    });

    it('throws ConflictException when the email is already registered', async () => {
      repository.findOne.mockResolvedValue({ id: 'existing-id' });

      await expect(service.createUser(dto)).rejects.toBeInstanceOf(
        ConflictException,
      );
      expect(repository.create).not.toHaveBeenCalled();
    });

    it('stores the hash of a generated password, never the plain one', async () => {
      await service.createUser(dto, transaction);

      expect(mockedHashPassword).toHaveBeenCalledWith('abcd-efgh-ijkl');
      expect(repository.create).toHaveBeenCalledWith(
        { ...dto, password: 'hashed-password' },
        { transaction },
      );
    });

    it('returns the created user without the password', async () => {
      const result = await service.createUser(dto);

      expect(result).toEqual({ id: 'user-id', ...dto });
      expect(result).not.toHaveProperty('password');
    });

    it('works without a transaction', async () => {
      await service.createUser(dto);

      expect(repository.create).toHaveBeenCalledWith(
        { ...dto, password: 'hashed-password' },
        { transaction: undefined },
      );
    });
  });

  describe('registerUserToOrganization', () => {
    it('creates the user linked to the organization inside the transaction', async () => {
      await service.registerUserToOrganization('org-id', dto, transaction);

      expect(repository.create).toHaveBeenCalledWith(
        { ...dto, organizationId: 'org-id', password: 'hashed-password' },
        { transaction },
      );
    });

    it('returns the user without the password', async () => {
      const result = await service.registerUserToOrganization(
        'org-id',
        dto,
        transaction,
      );

      expect(result.id).toBe('user-id');
      expect(result).not.toHaveProperty('password');
    });

    it('propagates the conflict when the email already exists', async () => {
      repository.findOne.mockResolvedValue({ id: 'existing-id' });

      await expect(
        service.registerUserToOrganization('org-id', dto, transaction),
      ).rejects.toBeInstanceOf(ConflictException);
    });
  });

  describe('createSuperAdmin', () => {
    const email = 'superadmin@example.com';

    beforeEach(() => {
      configService.get.mockReturnValue(email);
      rolesService.findOne.mockResolvedValue({ id: 'super-admin-role-id' });
    });

    it('reads the email from SUPER_ADMIN_EMAIL', async () => {
      await service.createSuperAdmin();

      expect(configService.get).toHaveBeenCalledWith('SUPER_ADMIN_EMAIL', {
        infer: true,
      });
    });

    it('finds the SUPER_ADMIN role by name inside the transaction', async () => {
      await service.createSuperAdmin();

      expect(repository.transaction).toHaveBeenCalledTimes(1);
      expect(rolesService.findOne).toHaveBeenCalledWith(
        { name: RoleNameEnum.SUPER_ADMIN },
        true,
        { attributes: ['id'], transaction },
      );
    });

    it('creates an active "Super Admin" user with that role', async () => {
      await service.createSuperAdmin();

      expect(repository.create).toHaveBeenCalledWith(
        {
          firstName: 'Super',
          lastName: 'Admin',
          email,
          roleId: 'super-admin-role-id',
          status: UserStatusEnum.ACTIVE,
          password: 'hashed-password',
        },
        { transaction },
      );
    });

    it('resolves without returning the user', async () => {
      await expect(service.createSuperAdmin()).resolves.toBeUndefined();
    });

    it('does not create the user when the role does not exist', async () => {
      rolesService.findOne.mockRejectedValue(
        new NotFoundException('Rol no encontrado'),
      );

      await expect(service.createSuperAdmin()).rejects.toBeInstanceOf(
        NotFoundException,
      );
      expect(repository.create).not.toHaveBeenCalled();
    });

    it('throws ConflictException when the super admin already exists', async () => {
      repository.findOne.mockResolvedValue({ id: 'existing-id' });

      await expect(service.createSuperAdmin()).rejects.toBeInstanceOf(
        ConflictException,
      );
      expect(repository.create).not.toHaveBeenCalled();
    });
  });
});
