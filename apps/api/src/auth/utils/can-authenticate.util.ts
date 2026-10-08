import UserStatusEnum from '@common/enums/user-status.enum';

const ALLOWED_STATUSES: readonly UserStatusEnum[] = [
  UserStatusEnum.PENDING,
  UserStatusEnum.ACTIVE,
];

const canAuthenticate = (user: {
  status: UserStatusEnum;
  isActive: boolean;
  organizationId?: string | null;
  organization?: { isActive: boolean } | null;
}): boolean =>
  user.isActive &&
  ALLOWED_STATUSES.includes(user.status) &&
  (user.organization ? user.organization.isActive : !user.organizationId);

export default canAuthenticate;
