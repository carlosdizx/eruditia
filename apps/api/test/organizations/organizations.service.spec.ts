import 'reflect-metadata';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { Op, Transaction } from 'sequelize';
import RoleNameEnum from '@common/enums/role-name.enum';
import DeletedFilterEnum from '@common/enums/deleted-filter.enum';
import UserModel from '@database/models/user.model';
import OrganizationsService from '../../src/organizations/organizations.service';
import OrganizationRepository from '../../src/organizations/organization.repository';
import UsersService from '../../src/users/users.service';
import RolesService from '../../src/roles/roles.service';
import CreateOrganizationDto from '../../src/organizations/dto/create-organization.dto';
import ListOrganizationsDto from '../../src/organizations/dto/list-organizations.dto';
import CreateUserDto from '../../src/users/dto/create-user.dto';

describe('OrganizationsService', () => {
  let repository: {
    create: jest.Mock;
    findByPk: jest.Mock;
    updateByPk: jest.Mock;
    deleteByPk: jest.Mock;
    restoreByPk: jest.Mock;
    findAllPaginated: jest.Mock;
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
      findByPk: jest.fn().mockResolvedValue({ id: 'org-id' }),
      updateByPk: jest.fn().mockResolvedValue({ id: 'org-id' }),
      deleteByPk: jest.fn().mockResolvedValue({ id: 'org-id' }),
      restoreByPk: jest.fn().mockResolvedValue({ id: 'org-id' }),
      findAllPaginated: jest.fn().mockResolvedValue({ data: [], meta: {} }),
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

  describe('listOrganizations', () => {
    const listDto = (deleted?: DeletedFilterEnum) =>
      Object.assign(new ListOrganizationsDto(), {
        page: 1,
        pageSize: 10,
        ...(deleted && { deleted }),
      });

    it('excludes deleted organizations by default', async () => {
      const dto = listDto();

      await expect(service.listOrganizations(dto)).resolves.toEqual({
        data: [],
        meta: {},
      });
      expect(dto.deleted).toBe(DeletedFilterEnum.EXCLUDE);
      expect(repository.findAllPaginated).toHaveBeenCalledWith(dto, undefined, {
        paranoid: true,
      });
    });

    it('includes deleted organizations when asked to', async () => {
      const dto = listDto(DeletedFilterEnum.INCLUDE);

      await service.listOrganizations(dto);

      expect(repository.findAllPaginated).toHaveBeenCalledWith(dto, undefined, {
        paranoid: false,
      });
    });

    it('lists only deleted organizations', async () => {
      const dto = listDto(DeletedFilterEnum.ONLY);

      await service.listOrganizations(dto);

      expect(repository.findAllPaginated).toHaveBeenCalledWith(
        dto,
        { deletedAt: { [Op.ne]: null } },
        { paranoid: false },
      );
    });
  });

  describe('findOrganization', () => {
    it('returns the organization with its owner', async () => {
      await expect(service.findOrganization('org-id')).resolves.toEqual({
        id: 'org-id',
      });
      expect(repository.findByPk).toHaveBeenCalledWith('org-id', true, {
        include: [
          {
            model: UserModel,
            as: 'owner',
            attributes: ['id', 'firstName', 'lastName', 'email'],
          },
        ],
      });
    });

    it('propagates NotFoundException for an unknown organization', async () => {
      repository.findByPk.mockRejectedValue(new NotFoundException());

      await expect(service.findOrganization('org-id')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });

  describe('updateOrganization', () => {
    it('updates the organization lowercasing the slug', async () => {
      await expect(
        service.updateOrganization('org-id', {
          name: 'Nuevo',
          slug: 'Nuevo-Slug',
        }),
      ).resolves.toEqual({ id: 'org-id' });
      expect(repository.updateByPk).toHaveBeenCalledWith(
        'org-id',
        { name: 'Nuevo', slug: 'nuevo-slug' },
        undefined,
      );
    });

    it('does not add a slug when it is not sent', async () => {
      await service.updateOrganization('org-id', { isActive: false });

      expect(repository.updateByPk).toHaveBeenCalledWith(
        'org-id',
        { isActive: false },
        undefined,
      );
    });

    it('does not update an unknown organization', async () => {
      repository.findByPk.mockRejectedValue(new NotFoundException());

      await expect(
        service.updateOrganization('org-id', { name: 'x' }),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(repository.updateByPk).not.toHaveBeenCalled();
    });
  });

  describe('deleteOrganization', () => {
    it('soft deletes the organization and returns nothing', async () => {
      await expect(
        service.deleteOrganization('org-id'),
      ).resolves.toBeUndefined();
      expect(repository.deleteByPk).toHaveBeenCalledWith('org-id', undefined);
    });

    it('does not delete an unknown organization', async () => {
      repository.findByPk.mockRejectedValue(new NotFoundException());

      await expect(service.deleteOrganization('org-id')).rejects.toBeInstanceOf(
        NotFoundException,
      );
      expect(repository.deleteByPk).not.toHaveBeenCalled();
    });
  });

  describe('restoreOrganization', () => {
    it('restores the soft deleted organization', async () => {
      await expect(service.restoreOrganization('org-id')).resolves.toEqual({
        id: 'org-id',
      });
      expect(repository.restoreByPk).toHaveBeenCalledWith('org-id', undefined);
    });

    it('rejects an unknown organization', async () => {
      repository.restoreByPk.mockResolvedValue(null);

      await expect(
        service.restoreOrganization('org-id'),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });
});
