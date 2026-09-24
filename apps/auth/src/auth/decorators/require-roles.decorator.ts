import { applyDecorators, SetMetadata, UseGuards } from '@nestjs/common';
import OrganizationRole from '@auth/enums/organization-role.enum';
import { REQUIRED_ROLES_KEY } from '@auth/constants/auth-metadata.constants';
import RolesGuard from '@auth/guards/roles.guard';

// Requires one of `roles` in the active organization of the user. Applies
// RolesGuard itself, so the requirement cannot be declared without being
// enforced.
const RequireRoles = (...roles: OrganizationRole[]) =>
  applyDecorators(
    SetMetadata(REQUIRED_ROLES_KEY, roles),
    UseGuards(RolesGuard),
  );

export default RequireRoles;
