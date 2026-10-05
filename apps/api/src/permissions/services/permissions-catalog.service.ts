import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { Op } from 'sequelize';
import PermissionRepository from '../repositories/permission.repository';
import permissionCatalog from '../permission-catalog';

@Injectable()
export default class PermissionsCatalogService implements OnApplicationBootstrap {
  private readonly logger = new Logger(PermissionsCatalogService.name);

  constructor(private readonly repository: PermissionRepository) {}

  public async onApplicationBootstrap() {
    await this.sync();
  }

  public sync = async () => {
    const catalog = permissionCatalog();

    await this.repository.upsertCatalog(catalog);

    // No se borran solos: quitarlos eliminaría en cascada las asignaciones.
    const orphans = await this.repository.findAll(
      { key: { [Op.notIn]: catalog.map(({ key }) => key) } },
      { attributes: ['key'] },
    );
    if (orphans.length)
      this.logger.warn(
        `Permisos en base de datos que ya no existen en PermissionEnum: ${orphans.map(({ key }) => key).join(', ')}`,
      );

    this.logger.verbose(`Permission catalog synced (${catalog.length})`);
  };
}
