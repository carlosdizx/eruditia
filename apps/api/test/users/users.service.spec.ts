jest.mock('@common/utils/password.util', () => ({
  generateFriendlyPassword: jest.fn(),
  hashPassword: jest.fn(),
}));

import 'reflect-metadata';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Transaction } from 'sequelize';
import UsersService from '../../src/users/users.service';
import UserRepository from '../../src/users/user.repository';
import RolesService from '../../src/roles/roles.service';
import CreateUserDto from '../../src/users/dto/create-user.dto';
import RoleNameEnum from '@common/enums/role-name.enum';
import UserStatusEnum from '@common/enums/user-status.enum';
import RoleCategoryEnum from '@common/enums/role-category.enum';
import OrganizationModel from '@database/models/organization.model';
import {
  DOCUMENT_IN_USE_MESSAGE,
  EMAIL_IN_USE_MESSAGE,
} from '../../src/users/constants/user-messages.constant';
import { Op } from 'sequelize';
import Env from '@common/schemas/env.schema';
import EmailService from '@email/email.service';
import { TEMPORARY_PASSWORD_SUBJECT } from '@email/templates/temporary-password.template';
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
    updateByPk: jest.Mock;
    deleteByPk: jest.Mock;
    transaction: jest.Mock;
  };
  let rolesService: { findOne: jest.Mock };
  let configService: { get: jest.Mock };
  let emailService: { main: jest.Mock };
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
      updateByPk: jest.fn(),
      deleteByPk: jest.fn().mockResolvedValue({ id: 'target-id' }),
      transaction: jest.fn((run: (tx: Transaction) => unknown) =>
        run(transaction),
      ),
    };
    rolesService = { findOne: jest.fn() };
    configService = {
      get: jest.fn((key: string) =>
        key === 'SMTP_USER' ? 'no-reply@eruditia.com' : undefined,
      ),
    };
    emailService = { main: jest.fn().mockResolvedValue(undefined) };

    mockedGenerateFriendlyPassword.mockReturnValue('abcd-efgh-ijkl');
    mockedHashPassword.mockResolvedValue('hashed-password');

    service = new UsersService(
      repository as unknown as UserRepository,
      rolesService as unknown as RolesService,
      configService as unknown as ConfigService<Env, true>,
      emailService as unknown as EmailService,
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

      await expect(service.createUser(dto)).rejects.toThrow(
        new ConflictException(EMAIL_IN_USE_MESSAGE),
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

    describe('temporary password email', () => {
      it('sends the temporary password to the new user', async () => {
        await service.createUser(dto, transaction);

        expect(emailService.main).toHaveBeenCalledTimes(1);
        expect(emailService.main).toHaveBeenCalledWith({
          from: 'no-reply@eruditia.com',
          to: dto.email,
          subject: TEMPORARY_PASSWORD_SUBJECT,
          html: expect.stringContaining('abcd-efgh-ijkl') as unknown,
        });
      });

      it('greets the user by first name', async () => {
        await service.createUser(dto, transaction);

        const [{ html }] = emailService.main.mock.calls[0] as [
          { html: string },
        ];
        expect(html).toContain('Hola, Ana');
      });

      it('sends the email only after the user is created', async () => {
        await service.createUser(dto, transaction);

        expect(repository.create.mock.invocationCallOrder[0]).toBeLessThan(
          emailService.main.mock.invocationCallOrder[0],
        );
      });

      it('does not send the email when the user already exists', async () => {
        repository.findOne.mockResolvedValue({ id: 'existing-id' });

        await expect(service.createUser(dto)).rejects.toBeInstanceOf(
          ConflictException,
        );
        expect(emailService.main).not.toHaveBeenCalled();
      });

      it('propagates the error so the transaction is rolled back', async () => {
        const error = new Error('smtp down');
        emailService.main.mockRejectedValue(error);

        await expect(service.createUser(dto, transaction)).rejects.toBe(error);
      });

      it('never logs the plain password', async () => {
        const spies = (
          ['log', 'debug', 'verbose', 'warn', 'error'] as const
        ).map((level) =>
          jest.spyOn(Logger.prototype, level).mockImplementation(() => {}),
        );

        await service.createUser(dto, transaction);

        for (const spy of spies) {
          for (const args of spy.mock.calls) {
            expect(JSON.stringify(args)).not.toContain('abcd-efgh-ijkl');
          }
        }
      });
    });
  });

  describe('markAsVerified', () => {
    it('delegates to the repository within the given transaction', async () => {
      const markAsVerified = jest.fn().mockResolvedValue(true);
      (repository as unknown as { markAsVerified: jest.Mock }).markAsVerified =
        markAsVerified;
      const now = new Date();

      await expect(
        service.markAsVerified('user-id', now, transaction),
      ).resolves.toBe(true);
      expect(markAsVerified).toHaveBeenCalledWith('user-id', now, transaction);
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

  describe('organization user management', () => {
    const actor = { userId: 'admin-id', organizationId: 'org-id' };

    const target = (overrides: Record<string, unknown> = {}) => ({
      id: 'target-id',
      roleId: 'teacher-role-id',
      isActive: true,
      organization: { id: 'org-id', ownerId: 'owner-id' },
      ...overrides,
    });

    // findOne se usa para el usuario objetivo y para el correo al crear.
    const mockTarget = (user: ReturnType<typeof target> | null) =>
      repository.findOne.mockImplementation((query: { id?: string }) => {
        if (query.id && !user) throw new NotFoundException();
        return Promise.resolve(query.id ? user : null);
      });

    beforeEach(() => {
      rolesService.findOne.mockResolvedValue({ id: 'teacher-role-id' });
      repository.updateByPk.mockImplementation((id: string, data: object) =>
        Promise.resolve({ id, ...data, password: 'hashed' }),
      );
    });

    describe('createOrganizationUser', () => {
      const newUser = { ...dto, roleId: 'teacher-role-id' };

      it('creates the user in the actor organization inside a transaction', async () => {
        await service.createOrganizationUser(actor, newUser);

        expect(repository.transaction).toHaveBeenCalledTimes(1);
        expect(repository.create).toHaveBeenCalledWith(
          { ...newUser, organizationId: 'org-id', password: 'hashed-password' },
          { transaction },
        );
      });

      it('only accepts organization (client) roles', async () => {
        await service.createOrganizationUser(actor, newUser);

        expect(rolesService.findOne).toHaveBeenCalledWith(
          { id: 'teacher-role-id', category: RoleCategoryEnum.CLIENT },
          false,
          { attributes: ['id'] },
        );
      });

      it('rejects a system role such as SUPER_ADMIN', async () => {
        rolesService.findOne.mockResolvedValue(null);

        await expect(
          service.createOrganizationUser(actor, newUser),
        ).rejects.toBeInstanceOf(BadRequestException);
        expect(repository.create).not.toHaveBeenCalled();
      });

      it('rejects a document already used in the organization', async () => {
        repository.findOne.mockImplementation(
          (query: { documentNumber?: string }) =>
            Promise.resolve(query.documentNumber ? { id: 'other-id' } : null),
        );

        await expect(
          service.createOrganizationUser(actor, {
            ...newUser,
            documentNumber: '1020',
          }),
        ).rejects.toThrow(DOCUMENT_IN_USE_MESSAGE);
        expect(repository.findOne).toHaveBeenCalledWith(
          { organizationId: 'org-id', documentNumber: '1020' },
          false,
          { attributes: ['id'] },
        );
        expect(repository.create).not.toHaveBeenCalled();
      });

      it('rejects an actor without organization', async () => {
        await expect(
          service.createOrganizationUser(
            { ...actor, organizationId: null },
            newUser,
          ),
        ).rejects.toBeInstanceOf(ForbiddenException);
        expect(repository.create).not.toHaveBeenCalled();
      });
    });

    describe('updateOrganizationUser', () => {
      it('looks the user up only inside the actor organization', async () => {
        mockTarget(target());

        await service.updateOrganizationUser(actor, 'target-id', {
          firstName: 'Eva',
        });

        expect(repository.findOne).toHaveBeenCalledWith(
          { id: 'target-id', organizationId: 'org-id' },
          true,
          {
            attributes: ['id', 'roleId', 'isActive'],
            include: [
              { model: OrganizationModel, attributes: ['id', 'ownerId'] },
            ],
          },
        );
      });

      it('returns 404 for a user of another organization', async () => {
        mockTarget(null);

        await expect(
          service.updateOrganizationUser(actor, 'target-id', {
            firstName: 'Eva',
          }),
        ).rejects.toBeInstanceOf(NotFoundException);
        expect(repository.updateByPk).not.toHaveBeenCalled();
      });

      it('updates and returns the user without the password', async () => {
        mockTarget(target());

        const result = await service.updateOrganizationUser(
          actor,
          'target-id',
          { firstName: 'Eva', isActive: false },
        );

        expect(repository.updateByPk).toHaveBeenCalledWith(
          'target-id',
          { firstName: 'Eva', isActive: false },
          undefined,
        );
        expect(result).toEqual({
          id: 'target-id',
          firstName: 'Eva',
          isActive: false,
        });
      });

      it('checks the document against other users of the organization', async () => {
        repository.findOne.mockImplementation(
          (query: { documentNumber?: string }) =>
            Promise.resolve(query.documentNumber ? null : target()),
        );

        await service.updateOrganizationUser(actor, 'target-id', {
          documentNumber: '1020',
        });

        expect(repository.findOne).toHaveBeenCalledWith(
          {
            organizationId: 'org-id',
            documentNumber: '1020',
            id: { [Op.ne]: 'target-id' },
          },
          false,
          { attributes: ['id'] },
        );
      });

      it('rejects a document used by another user of the organization', async () => {
        repository.findOne.mockImplementation(
          (query: { documentNumber?: string }) =>
            Promise.resolve(
              query.documentNumber ? { id: 'other-id' } : target(),
            ),
        );

        await expect(
          service.updateOrganizationUser(actor, 'target-id', {
            documentNumber: '1020',
          }),
        ).rejects.toThrow(DOCUMENT_IN_USE_MESSAGE);
        expect(repository.updateByPk).not.toHaveBeenCalled();
      });

      it('validates the new role', async () => {
        mockTarget(target());
        rolesService.findOne.mockResolvedValue(null);

        await expect(
          service.updateOrganizationUser(actor, 'target-id', {
            roleId: 'super-admin-role-id',
          }),
        ).rejects.toBeInstanceOf(BadRequestException);
        expect(repository.updateByPk).not.toHaveBeenCalled();
      });

      it.each([
        ['their own account', target({ id: 'admin-id' })],
        [
          'the organization owner',
          target({ organization: { id: 'org-id', ownerId: 'target-id' } }),
        ],
      ])('does not let the admin deactivate or re-role %s', async (_, user) => {
        mockTarget(user);

        await expect(
          service.updateOrganizationUser(actor, user.id, { isActive: false }),
        ).rejects.toBeInstanceOf(ForbiddenException);
        await expect(
          service.updateOrganizationUser(actor, user.id, {
            roleId: 'student-role-id',
          }),
        ).rejects.toBeInstanceOf(ForbiddenException);
        expect(repository.updateByPk).not.toHaveBeenCalled();
      });

      it('lets the admin rename their own account', async () => {
        mockTarget(target({ id: 'admin-id' }));

        await service.updateOrganizationUser(actor, 'admin-id', {
          firstName: 'Eva',
          roleId: 'teacher-role-id',
          isActive: true,
        });

        expect(repository.updateByPk).toHaveBeenCalled();
      });
    });

    describe('deleteOrganizationUser', () => {
      it('soft deletes a user of the organization', async () => {
        mockTarget(target());

        await expect(
          service.deleteOrganizationUser(actor, 'target-id'),
        ).resolves.toBeUndefined();
        expect(repository.deleteByPk).toHaveBeenCalledWith(
          'target-id',
          undefined,
        );
      });

      it.each([
        ['their own account', target({ id: 'admin-id' })],
        [
          'the organization owner',
          target({ organization: { id: 'org-id', ownerId: 'target-id' } }),
        ],
      ])('does not let the admin delete %s', async (_, user) => {
        mockTarget(user);

        await expect(
          service.deleteOrganizationUser(actor, user.id),
        ).rejects.toBeInstanceOf(ForbiddenException);
        expect(repository.deleteByPk).not.toHaveBeenCalled();
      });

      it('returns 404 for a user of another organization', async () => {
        mockTarget(null);

        await expect(
          service.deleteOrganizationUser(actor, 'target-id'),
        ).rejects.toBeInstanceOf(NotFoundException);
        expect(repository.deleteByPk).not.toHaveBeenCalled();
      });
    });
  });
});
