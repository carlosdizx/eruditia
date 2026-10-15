import { ForbiddenException } from '@nestjs/common';
import type AuthContextInterface from '@auth/interfaces/auth-context.interface';
import { NO_ORGANIZATION_MESSAGE } from '../../users/constants/user-messages.constant';

export type OrganizationActor = Pick<AuthContextInterface, 'organizationId'>;

// Aislamiento multi-tenant: todo se filtra por la organización de la sesión.
const organizationOf = ({ organizationId }: OrganizationActor) => {
  if (!organizationId) throw new ForbiddenException(NO_ORGANIZATION_MESSAGE);
  return organizationId;
};

export default organizationOf;
