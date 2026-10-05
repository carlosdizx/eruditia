import RoleCategoryEnum from '@common/enums/role-category.enum';

export default interface AuthContextInterface {
  sessionId: string;
  userId: string;
  organizationId: string | null;
  roleId: string;
  roleName: string;
  roleCategory: RoleCategoryEnum;
  expiresAt: Date;
}
