import { ModelCtor } from 'sequelize-typescript';
import OrganizationModel from './organization.model';
import UserModel from './user.model';
import UserTwoFactorMethodModel from './user-two-factor-method.model';
import UserPasskeyModel from './user-passkey.model';
import UserTwoFactorCodeModel from './user-two-factor-code.model';

// Register every @Table model here (never BaseModel/SoftDeleteModel).
// Consumed by databaseOptionsUtil so both the Nest app and the CLI
// (migrator/seeder) share the exact same set of models.
const models: ModelCtor[] = [
  OrganizationModel,
  UserModel,
  UserTwoFactorMethodModel,
  UserPasskeyModel,
  UserTwoFactorCodeModel,
];

export default models;
