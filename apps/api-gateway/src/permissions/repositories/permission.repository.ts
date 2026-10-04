import { ConflictException, Injectable, Logger } from '@nestjs/common';
import { CreationAttributes } from 'sequelize';
import AbstractRepository from '@database/repositories/abstract.repository';
import PermissionModel from '@database/models/permission.model';
import { PermissionCatalogEntry } from '../permission-catalog';

@Injectable()
export default class PermissionRepository extends AbstractRepository<PermissionModel> {
  constructor() {
    super(PermissionModel, {
      logger: new Logger(PermissionRepository.name),
      findByPkNotFoundMessage: 'Permiso no encontrado',
      findOneNotFoundMessage: 'Permiso no encontrado',
    });
  }

  // Idempotente: inserta los permisos nuevos y actualiza los existentes por key.
  public async upsertCatalog(entries: PermissionCatalogEntry[]): Promise<void> {
    try {
      await this.model.bulkCreate(
        entries as unknown as CreationAttributes<PermissionModel>[],
        {
          conflictAttributes: ['key'],
          updateOnDuplicate: ['resource', 'action', 'description', 'updatedAt'],
        },
      );
    } catch (error) {
      this.logger.error('Error syncing permission catalog');
      this.logger.error(error);
      throw new ConflictException(
        'No se pudo sincronizar el catálogo de permisos',
      );
    }
  }
}
