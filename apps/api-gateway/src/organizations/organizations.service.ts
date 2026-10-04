import { Injectable } from '@nestjs/common';
import { Transaction } from 'sequelize';
import OrganizationModel from '@database/models/organization.model';
import CrudService from '@database/services/crud.service';
import OrganizationRepository from './organization.repository';
import CreateOrganizationDto from './dto/create-organization.dto';
import CreateUserDto from '../users/dto/create-user.dto';
import UsersService from '../users/users.service';

@Injectable()
export default class OrganizationsService extends CrudService<
  OrganizationModel,
  OrganizationRepository
> {
  constructor(
    protected readonly repository: OrganizationRepository,
    private readonly usersService: UsersService,
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
    const { organizationId, ownerId } = await this.transaction(
      async (transaction) => {
        const organization = await this.createOrganization(
          createOrganizationDto,
          transaction,
        );
        const owner = await this.usersService.registerUserToOrganization(
          organization.id,
          createUserDto,
          transaction,
        );

        return { organizationId: organization.id, ownerId: owner.id };
      },
    );

    await this.updateByPk(organizationId, { ownerId });
  };
}
