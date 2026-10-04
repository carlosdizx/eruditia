import PermissionEnum from '@common/enums/permission.enum';

// Record obliga a describir cada permiso nuevo del enum.
const permissionDescriptions: Record<PermissionEnum, string> = {
  [PermissionEnum.USER_LIST]: 'Listar usuarios de la organización',
  [PermissionEnum.USER_CREATE]: 'Crear usuarios en la organización',
  [PermissionEnum.USER_UPDATE]: 'Editar usuarios de la organización',
  [PermissionEnum.USER_DELETE]: 'Eliminar usuarios de la organización',
  [PermissionEnum.ROLE_LIST]: 'Listar roles disponibles',
};

export interface PermissionCatalogEntry {
  key: PermissionEnum;
  resource: string;
  action: string;
  description: string;
}

const permissionCatalog = (): PermissionCatalogEntry[] =>
  Object.values(PermissionEnum).map((key) => {
    const [resource, action] = key.split(':');
    return { key, resource, action, description: permissionDescriptions[key] };
  });

export default permissionCatalog;
