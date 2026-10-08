import { Injectable, NotFoundException } from '@nestjs/common';
import { Transaction } from 'sequelize';
import OrganizationModel from '@database/models/organization.model';
import CrudService from '@database/services/crud.service';
import OrganizationRepository from './organization.repository';
import CreateOrganizationDto from './dto/create-organization.dto';
import CreateUserDto from '../users/dto/create-user.dto';
import UsersService from '../users/users.service';
import RolesService from '../roles/roles.service';
import RoleNameEnum from '@common/enums/role-name.enum';
import UserModel from '@database/models/user.model';
import UpdateOrganizationDto from './dto/update-organization.dto';

@Injectable()
export default class OrganizationsService extends CrudService<
  OrganizationModel,
  OrganizationRepository
> {
  constructor(
    protected readonly repository: OrganizationRepository,
    private readonly usersService: UsersService,
    private readonly rolesService: RolesService,
  ) {
    super(repository);
  }

  public createOrganization = async (
    dto: CreateOrganizationDto,
    transaction: Transaction,
  ) => {
    return await this.create(
      { ...dto, slug: dto.slug.toLowerCase() },
      { transaction },
    );
  };

  public registerOrganizationAndOwner = async (
    createOrganizationDto: CreateOrganizationDto,
    createUserDto: CreateUserDto,
  ) => {
    let { roleId } = createUserDto;
    if (!roleId) {
      const { id } = (await this.rolesService.findOne(
        { name: RoleNameEnum.ADMIN },
        true,
        { attributes: ['id'] },
      ))!;
      roleId = id;
    }
    const { organizationId, ownerId } = await this.transaction(
      async (transaction) => {
        const organization = await this.createOrganization(
          createOrganizationDto,
          transaction,
        );
        const owner = await this.usersService.registerUserToOrganization(
          organization.id,
          { ...createUserDto, roleId },
          transaction,
        );

        return { organizationId: organization.id, ownerId: owner.id };
      },
    );

    await this.updateByPk(organizationId, { ownerId });
  };

  public findOrganization = async (organizationId: string) => {
    return await this.findByPk(organizationId, true, {
      include: [
        {
          model: UserModel,
          as: 'owner',
          attributes: ['id', 'firstName', 'lastName', 'email'],
        },
      ],
    });
  };

  public updateOrganization = async (
    organizationId: string,
    dto: UpdateOrganizationDto,
  ) => {
    await this.findByPk(organizationId, true, { attributes: ['id'] });

    return await this.updateByPk(organizationId, {
      ...dto,
      ...(dto.slug && { slug: dto.slug.toLowerCase() }),
    });
  };

  public deleteOrganization = async (organizationId: string) => {
    await this.findByPk(organizationId, true, { attributes: ['id'] });
    await this.deleteByPk(organizationId);
  };

  public restoreOrganization = async (organizationId: string) => {
    const organization = await this.restoreByPk(organizationId);
    if (!organization)
      throw new NotFoundException('No se encontró la organización');

    return organization;
  };
}
