import { ModelCtor } from 'sequelize-typescript';
import OrganizationModel from './organization.model';
import RoleModel from './role.model';
import UserModel from './user.model';
import UserTwoFactorMethodModel from './user-two-factor-method.model';
import UserPasskeyModel from './user-passkey.model';
import UserTwoFactorCodeModel from './user-two-factor-code.model';
import UserSessionModel from './user-session.model';
import PermissionModel from './permission.model';
import RolePermissionModel from './role-permission.model';
import OrganizationPermissionModel from './organization-permission.model';

// Register every @Table model here (never BaseModel/SoftDeleteModel).
// Consumed by databaseOptionsUtil so both the Nest app and the CLI
// (migrator/seeder) share the exact same set of models.
const models: ModelCtor[] = [
  OrganizationModel,
  RoleModel,
  UserModel,
  UserTwoFactorMethodModel,
  UserPasskeyModel,
  UserTwoFactorCodeModel,
  UserSessionModel,
  PermissionModel,
  RolePermissionModel,
  OrganizationPermissionModel,
];

export default models;
