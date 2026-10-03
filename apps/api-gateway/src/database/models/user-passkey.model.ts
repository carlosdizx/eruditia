import {
  AllowNull,
  BelongsTo,
  Column,
  DataType,
  Default,
  ForeignKey,
  Table,
} from 'sequelize-typescript';
import BaseModel from './base.model';
import UserModel from './user.model';

@Table({ tableName: 'user_passkeys', underscored: true, paranoid: true })
export default class UserPasskeyModel extends BaseModel {
  @ForeignKey(() => UserModel)
  @Column(DataType.UUID)
  declare userId: string;

  @BelongsTo(() => UserModel, 'userId')
  declare user?: UserModel;

  @AllowNull
  @Column(DataType.STRING(100))
  declare name: string | null;

  @Column(DataType.TEXT)
  declare credentialId: string;

  @Column(DataType.TEXT)
  declare publicKey: string;

  @Default(0)
  @Column({
    type: DataType.BIGINT,
    get(this: UserPasskeyModel) {
      return Number(this.getDataValue('counter'));
    },
  })
  declare counter: number;

  @Column(DataType.STRING(32))
  declare deviceType: string;

  @Default(false)
  @Column
  declare backedUp: boolean;

  @AllowNull
  @Column(DataType.ARRAY(DataType.STRING))
  declare transports: string[] | null;

  @AllowNull
  @Column(DataType.STRING(36))
  declare aaguid: string | null;

  @AllowNull
  @Column(DataType.DATE)
  declare lastUsedAt: Date | null;
}
