import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import PermissionEnum from '@common/enums/permission.enum';
import SetPermissionsDto from '../../../src/permissions/dto/set-permissions.dto';

const errorsFor = (permissions: unknown) =>
  validateSync(plainToInstance(SetPermissionsDto, { permissions }));

describe('SetPermissionsDto', () => {
  it('accepts known permissions', () => {
    expect(
      errorsFor([PermissionEnum.USER_LIST, PermissionEnum.ROLE_LIST]),
    ).toHaveLength(0);
  });

  it('accepts an empty list to revoke everything', () => {
    expect(errorsFor([])).toHaveLength(0);
  });

  it('rejects unknown permissions', () => {
    expect(errorsFor(['hack:all'])).not.toHaveLength(0);
  });

  it('rejects duplicates', () => {
    expect(
      errorsFor([PermissionEnum.USER_LIST, PermissionEnum.USER_LIST]),
    ).not.toHaveLength(0);
  });

  it.each([undefined, 'user:list', null])('rejects %p', (value) => {
    expect(errorsFor(value)).not.toHaveLength(0);
  });
});
