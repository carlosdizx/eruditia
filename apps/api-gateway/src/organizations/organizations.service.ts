import { Injectable } from '@nestjs/common';
import { Transaction } from 'sequelize';
import { OrganizationModel } from '@database/models/organization.model';
import CrudService from '@database/services/crud.service';
import OrganizationRepository from './organization.repository';
import CreateOrganizationDto from './dto/create-organization.dto';

@Injectable()
export default class OrganizationsService extends CrudService<
  OrganizationModel,
  OrganizationRepository
> {
  constructor(repository: OrganizationRepository) {
    super(repository);
  }

  public createOrganization = async (
    dto: CreateOrganizationDto,
    transaction?: Transaction,
  ) => {
    return await this.create(
      { ...dto, slug: dto.slug.toLowerCase() },
      { transaction },
    );
  };

  public assignOwnerIfMissing = async (
    organizationId: string,
    userId: string,
    transaction: Transaction,
  ) => {
    const organization = await this.findByPk(organizationId, true, {
      transaction,
      lock: transaction.LOCK.NO_KEY_UPDATE,
    });

    if (organization!.ownerId) return organization;

    return await this.updateByPk(
      organizationId,
      { ownerId: userId },
      { transaction },
    );
  };
}
