import { ConflictException, Injectable, Logger } from '@nestjs/common';
import { CreationAttributes, Transaction } from 'sequelize';
import AbstractRepository from '@database/repositories/abstract.repository';
import OrganizationPermissionModel from '@database/models/organization-permission.model';

@Injectable()
export default class OrganizationPermissionRepository extends AbstractRepository<OrganizationPermissionModel> {
  constructor() {
    super(OrganizationPermissionModel, {
      logger: new Logger(OrganizationPermissionRepository.name),
    });
  }

  public async replaceForOrganization(
    organizationId: string,
    permissionIds: string[],
    transaction: Transaction,
  ): Promise<void> {
    try {
      await this.model.destroy({ where: { organizationId }, transaction });
      await this.model.bulkCreate(
        permissionIds.map(
          (permissionId) =>
            ({
              organizationId,
              permissionId,
            }) as CreationAttributes<OrganizationPermissionModel>,
        ),
        { transaction },
      );
    } catch (error) {
      this.logger.error('Error replacing organization permissions');
      this.logger.error(error);
      throw new ConflictException(
        'No se pudieron asignar los permisos a la organización',
      );
    }
  }
}
