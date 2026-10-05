import 'reflect-metadata';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { Transaction } from 'sequelize';
import RoleNameEnum from '@common/enums/role-name.enum';
import OrganizationsService from '../../src/organizations/organizations.service';
import OrganizationRepository from '../../src/organizations/organization.repository';
import UsersService from '../../src/users/users.service';
import RolesService from '../../src/roles/roles.service';
import CreateOrganizationDto from '../../src/organizations/dto/create-organization.dto';
import CreateUserDto from '../../src/users/dto/create-user.dto';

describe('OrganizationsService', () => {
  let repository: {
    create: jest.Mock;
    updateByPk: jest.Mock;
    transaction: jest.Mock;
  };
  let usersService: { registerUserToOrganization: jest.Mock };
  let rolesService: { findOne: jest.Mock };
  let service: OrganizationsService;

  const transaction = { id: 'tx' } as unknown as Transaction;

  const organizationDto = {
    name: 'Colegio X',
    slug: 'Colegio-X',
  } as CreateOrganizationDto;

  const ownerDto: CreateUserDto = {
    firstName: 'Ana',
    lastName: 'Lopez',
    email: 'ana@example.com',
    roleId: 'admin-role-id',
  };

  beforeEach(() => {
    repository = {
      create: jest.fn().mockResolvedValue({ id: 'org-id' }),
      updateByPk: jest.fn().mockResolvedValue({ id: 'org-id' }),
      transaction: jest.fn((run: (tx: Transaction) => unknown) =>
        run(transaction),
      ),
    };
    usersService = {
      registerUserToOrganization: jest
        .fn()
        .mockResolvedValue({ id: 'owner-id' }),
    };
    rolesService = {
      findOne: jest.fn().mockResolvedValue({ id: 'default-admin-role-id' }),
    };

    service = new OrganizationsService(
      repository as unknown as OrganizationRepository,
      usersService as unknown as UsersService,
      rolesService as unknown as RolesService,
    );
  });

  describe('createOrganization', () => {
    it('lowercases the slug and creates inside the transaction', async () => {
      await service.createOrganization(organizationDto, transaction);

      expect(repository.create).toHaveBeenCalledWith(
        { ...organizationDto, slug: 'colegio-x' },
        { transaction },
      );
    });

    it('returns the created organization', async () => {
      await expect(
        service.createOrganization(organizationDto, transaction),
      ).resolves.toEqual({ id: 'org-id' });
    });
  });

  describe('registerOrganizationAndOwner', () => {
    it('creates the organization and its owner in the same transaction', async () => {
      await service.registerOrganizationAndOwner(organizationDto, ownerDto);

      expect(repository.transaction).toHaveBeenCalledTimes(1);
      expect(repository.create).toHaveBeenCalledWith(
        { ...organizationDto, slug: 'colegio-x' },
        { transaction },
      );
      expect(usersService.registerUserToOrganization).toHaveBeenCalledWith(
        'org-id',
        ownerDto,
        transaction,
      );
    });

    it('assigns the owner to the organization after registering it', async () => {
      await service.registerOrganizationAndOwner(organizationDto, ownerDto);

      expect(repository.updateByPk).toHaveBeenCalledWith(
        'org-id',
        { ownerId: 'owner-id' },
        undefined,
      );
      expect(
        usersService.registerUserToOrganization.mock.invocationCallOrder[0],
      ).toBeLessThan(repository.updateByPk.mock.invocationCallOrder[0]);
    });

    it('resolves without returning anything', async () => {
      await expect(
        service.registerOrganizationAndOwner(organizationDto, ownerDto),
      ).resolves.toBeUndefined();
    });

    it('keeps the role sent for the owner without looking up the default one', async () => {
      await service.registerOrganizationAndOwner(organizationDto, ownerDto);

      expect(rolesService.findOne).not.toHaveBeenCalled();
    });

    describe('when the owner has no role', () => {
      const ownerWithoutRole: CreateUserDto = {
        ...ownerDto,
        roleId: undefined,
      };

      it('assigns the ADMIN role to the owner', async () => {
        await service.registerOrganizationAndOwner(
          organizationDto,
          ownerWithoutRole,
        );

        expect(rolesService.findOne).toHaveBeenCalledWith(
          { name: RoleNameEnum.ADMIN },
          true,
          { attributes: ['id'] },
        );
        expect(usersService.registerUserToOrganization).toHaveBeenCalledWith(
          'org-id',
          { ...ownerWithoutRole, roleId: 'default-admin-role-id' },
          transaction,
        );
      });

      it('looks up the role before opening the transaction', async () => {
        await service.registerOrganizationAndOwner(
          organizationDto,
          ownerWithoutRole,
        );

        expect(rolesService.findOne.mock.invocationCallOrder[0]).toBeLessThan(
          repository.transaction.mock.invocationCallOrder[0],
        );
      });

      it('creates nothing when the ADMIN role does not exist', async () => {
        rolesService.findOne.mockRejectedValue(new NotFoundException());

        await expect(
          service.registerOrganizationAndOwner(
            organizationDto,
            ownerWithoutRole,
          ),
        ).rejects.toBeInstanceOf(NotFoundException);
        expect(repository.transaction).not.toHaveBeenCalled();
        expect(repository.updateByPk).not.toHaveBeenCalled();
      });
    });

    it('does not register the owner when the organization cannot be created', async () => {
      repository.create.mockRejectedValue(new ConflictException());

      await expect(
        service.registerOrganizationAndOwner(organizationDto, ownerDto),
      ).rejects.toBeInstanceOf(ConflictException);
      expect(usersService.registerUserToOrganization).not.toHaveBeenCalled();
      expect(repository.updateByPk).not.toHaveBeenCalled();
    });

    it('does not assign an owner when the owner cannot be registered', async () => {
      usersService.registerUserToOrganization.mockRejectedValue(
        new ConflictException(),
      );

      await expect(
        service.registerOrganizationAndOwner(organizationDto, ownerDto),
      ).rejects.toBeInstanceOf(ConflictException);
      expect(repository.updateByPk).not.toHaveBeenCalled();
    });
  });
});
