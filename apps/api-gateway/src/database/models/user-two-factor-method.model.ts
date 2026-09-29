import {
  AllowNull,
  BelongsTo,
  Column,
  DataType,
  Default,
  ForeignKey,
  Table,
} from 'sequelize-typescript';
import TwoFactorMethodEnum from '@common/enums/two-factor-method.enum';
import { BaseModel } from './base.model';
import { UserModel } from './user.model';

@Table({
  tableName: 'user_two_factor_methods',
  underscored: true,
  paranoid: true,
})
export class UserTwoFactorMethodModel extends BaseModel {
  @ForeignKey(() => UserModel)
  @Column(DataType.UUID)
  declare userId: string;

  @BelongsTo(() => UserModel, 'userId')
  declare user?: UserModel;

  @Column(DataType.ENUM(...Object.values(TwoFactorMethodEnum)))
  declare type: TwoFactorMethodEnum;

  @Default(false)
  @Column
  declare isEnabled: boolean;

  @Default(false)
  @Column
  declare isDefault: boolean;

  @AllowNull
  @Column(DataType.TEXT)
  declare secret: string | null;

  @AllowNull
  @Column(DataType.DATE)
  declare verifiedAt: Date | null;

  @AllowNull
  @Column(DataType.DATE)
  declare lastUsedAt: Date | null;
}
