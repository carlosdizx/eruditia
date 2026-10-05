import RoleCategoryEnum from '@common/enums/role-category.enum';
import isCoreRole from '@auth/utils/is-core-role.util';

describe('isCoreRole', () => {
  it('is true for core roles', () => {
    expect(isCoreRole({ roleCategory: RoleCategoryEnum.CORE })).toBe(true);
  });

  it('is false for client roles', () => {
    expect(isCoreRole({ roleCategory: RoleCategoryEnum.CLIENT })).toBe(false);
  });
});
