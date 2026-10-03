import {
  AllowNull,
  BelongsTo,
  Column,
  DataType,
  Default,
  ForeignKey,
  HasMany,
  Table,
} from 'sequelize-typescript';
import UserStatusEnum from '@common/enums/user-status.enum';
import BaseModel from './base.model';
import type { Relation } from '@database/types/relation.type';
import OrganizationModel from './organization.model';
import UserTwoFactorMethodModel from './user-two-factor-method.model';
import UserPasskeyModel from './user-passkey.model';
import UserTwoFactorCodeModel from './user-two-factor-code.model';

@Table({ tableName: 'users', underscored: true, paranoid: true })
export default class UserModel extends BaseModel {
  @ForeignKey(() => OrganizationModel)
  @AllowNull
  @Column(DataType.UUID)
  declare organizationId: string | null;

  @BelongsTo(() => OrganizationModel, 'organizationId')
  declare organization?: Relation<OrganizationModel>;

  @Column(DataType.STRING(100))
  declare firstName: string;

  @Column(DataType.STRING(100))
  declare lastName: string;

  @Column
  declare email: string;

  @Column
  declare password: string;

  @Default(UserStatusEnum.PENDING)
  @Column(DataType.ENUM(...Object.values(UserStatusEnum)))
  declare status: UserStatusEnum;

  @Default(true)
  @Column
  declare isActive: boolean;

  @Default(false)
  @Column
  declare isVerified: boolean;

  @AllowNull
  @Column(DataType.DATE)
  declare verifiedAt: Date | null;

  @Default(false)
  @Column
  declare twoFactorEnabled: boolean;

  @AllowNull
  @Column(DataType.DATE)
  declare lastLoginAt: Date | null;

  @HasMany(() => UserTwoFactorMethodModel, 'userId')
  declare twoFactorMethods?: UserTwoFactorMethodModel[];

  @HasMany(() => UserPasskeyModel, 'userId')
  declare passkeys?: UserPasskeyModel[];

  @HasMany(() => UserTwoFactorCodeModel, 'userId')
  declare twoFactorCodes?: UserTwoFactorCodeModel[];
}
