import PermissionEnum from '@common/enums/permission.enum';
import permissionCatalog from '../../src/permissions/permission-catalog';

describe('permissionCatalog', () => {
  const catalog = permissionCatalog();

  it('has one entry per PermissionEnum value', () => {
    expect(catalog.map(({ key }) => key)).toEqual(
      Object.values(PermissionEnum),
    );
  });

  it.each(Object.values(PermissionEnum))(
    '"%s" follows the <resource>:<action> format',
    (key) => {
      expect(key).toMatch(/^[a-z][a-z-]*:[a-z][a-z-]*$/);
    },
  );

  it('splits each key into resource and action', () => {
    expect(catalog).toContainEqual(
      expect.objectContaining({
        key: PermissionEnum.USER_CREATE,
        resource: 'user',
        action: 'create',
      }),
    );
  });

  it('describes every permission', () => {
    for (const { description } of catalog)
      expect(description).toEqual(expect.any(String));
  });
});
