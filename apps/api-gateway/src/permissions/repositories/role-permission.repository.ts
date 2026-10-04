import { ConflictException, Injectable, Logger } from '@nestjs/common';
import { CreationAttributes, Transaction } from 'sequelize';
import AbstractRepository from '@database/repositories/abstract.repository';
import RolePermissionModel from '@database/models/role-permission.model';

@Injectable()
export default class RolePermissionRepository extends AbstractRepository<RolePermissionModel> {
  constructor() {
    super(RolePermissionModel, {
      logger: new Logger(RolePermissionRepository.name),
    });
  }

  public async replaceForRole(
    roleId: string,
    permissionIds: string[],
    transaction: Transaction,
  ): Promise<void> {
    try {
      await this.model.destroy({ where: { roleId }, transaction });
      await this.model.bulkCreate(
        permissionIds.map(
          (permissionId) =>
            ({
              roleId,
              permissionId,
            }) as CreationAttributes<RolePermissionModel>,
        ),
        { transaction },
      );
    } catch (error) {
      this.logger.error('Error replacing role permissions');
      this.logger.error(error);
      throw new ConflictException('No se pudieron asignar los permisos al rol');
    }
  }
}
