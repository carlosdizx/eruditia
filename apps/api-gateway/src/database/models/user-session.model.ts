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
import OrganizationModel from './organization.model';

@Table({ tableName: 'user_sessions', underscored: true })
export default class UserSessionModel extends Model {
  @PrimaryKey
  @Default(Sequelize.literal('uuidv7()'))
  @Column(DataType.UUID)
  declare id: string;

  @ForeignKey(() => UserModel)
  @Column(DataType.UUID)
  declare userId: string;

  @BelongsTo(() => UserModel, 'userId')
  declare user?: Relation<UserModel>;

  @ForeignKey(() => OrganizationModel)
  @AllowNull
  @Column(DataType.UUID)
  declare organizationId: string | null;

  @BelongsTo(() => OrganizationModel, 'organizationId')
  declare organization?: Relation<OrganizationModel> | null;

  // SHA-256 del token: el token en claro solo lo conoce el cliente.
  @Column(DataType.STRING(64))
  declare tokenHash: string;

  @AllowNull
  @Column(DataType.STRING(45))
  declare ipAddress: string | null;

  @AllowNull
  @Column(DataType.TEXT)
  declare userAgent: string | null;

  @Column(DataType.DATE)
  declare expiresAt: Date;

  @Column(DataType.DATE)
  declare lastActivityAt: Date;

  @AllowNull
  @Column(DataType.DATE)
  declare revokedAt: Date | null;

  @CreatedAt
  declare createdAt: Date;

  @UpdatedAt
  declare updatedAt: Date;
}
