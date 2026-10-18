import {
  AllowNull,
  BelongsTo,
  Column,
  CreatedAt,
  DataType,
  Default,
  ForeignKey,
  Model,
  PrimaryKey,
  Sequelize,
  Table,
  UpdatedAt,
} from 'sequelize-typescript';
import type { Relation } from '@database/types/relation.type';
import UserModel from './user.model';

@Table({ tableName: 'user_two_factor_codes', underscored: true })
export default class UserTwoFactorCodeModel extends Model {
  @PrimaryKey
  @Default(Sequelize.literal('uuidv7()'))
  @Column(DataType.UUID)
  declare id: string;

  @ForeignKey(() => UserModel)
  @Column(DataType.UUID)
  declare userId: string;

  @BelongsTo(() => UserModel, 'userId')
  declare user?: Relation<UserModel>;

  @Column
  declare codeHash: string;

  @Column(DataType.DATE)
  declare expiresAt: Date;

  @Default(0)
  @Column
  declare attempts: number;

  @AllowNull
  @Column(DataType.DATE)
  declare consumedAt: Date | null;

  @CreatedAt
  declare createdAt: Date;

  @UpdatedAt
  declare updatedAt: Date;
}
