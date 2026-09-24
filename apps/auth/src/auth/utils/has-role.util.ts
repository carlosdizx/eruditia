// Better Auth stores several roles as a comma-separated string
// ("admin,supervisor"), both in `user.role` and in `member.role`.
const hasRole = (
  role: string | string[] | null | undefined,
  allowedRoles: readonly string[],
): boolean => {
  if (!role) return false;

  const roles = Array.isArray(role) ? role : role.split(',');

  return roles.some((value) => allowedRoles.includes(value.trim()));
};

export default hasRole;
