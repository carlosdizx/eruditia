export const rolePermissionsCacheKey = (roleId: string) =>
  `permissions:role:${roleId}`;

export const organizationPermissionsCacheKey = (organizationId: string) =>
  `permissions:organization:${organizationId}`;
