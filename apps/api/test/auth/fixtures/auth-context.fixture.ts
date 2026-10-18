import RoleCategoryEnum from '@common/enums/role-category.enum';
import AuthContextInterface from '@auth/interfaces/auth-context.interface';

const authContextFixture = (
  overrides: Partial<AuthContextInterface> = {},
): AuthContextInterface => ({
  sessionId: 'session-id',
  userId: 'user-id',
  organizationId: 'org-id',
  roleId: 'role-id',
  roleName: 'ADMIN',
  roleCategory: RoleCategoryEnum.CLIENT,
  expiresAt: new Date('2026-10-05T12:00:00.000Z'),
  ...overrides,
});

export default authContextFixture;
