import {
  AllowNull,
  BelongsTo,
  BelongsToMany,
  Column,
  DataType,
  Default,
  ForeignKey,
  HasMany,
  Table,
} from 'sequelize-typescript';
import BaseModel from './base.model';
import type { Relation } from '@database/types/relation.type';
import UserModel from './user.model';
import PermissionModel from './permission.model';
import OrganizationPermissionModel from './organization-permission.model';

@Table({ tableName: 'organizations', underscored: true, paranoid: true })
export default class OrganizationModel extends BaseModel {
  @Column
  declare name: string;

  @Column(DataType.STRING(100))
  declare slug: string;

  @AllowNull
  @Column(DataType.STRING)
  declare legalName: string | null;

  @AllowNull
  @Column(DataType.STRING(50))
  declare taxId: string | null;

  @AllowNull
  @Column(DataType.STRING(50))
  declare schoolCode: string | null;

  @AllowNull
  @Column(DataType.STRING)
  declare email: string | null;

  @AllowNull
  @Column(DataType.STRING(30))
  declare phone: string | null;

  @AllowNull
  @Column(DataType.STRING)
  declare address: string | null;

  @AllowNull
  @Column(DataType.STRING(100))
  declare city: string | null;

  @AllowNull
  @Column(DataType.STRING(100))
  declare state: string | null;

  @AllowNull
  @Column(DataType.STRING(2))
  declare country: string | null;

  @AllowNull
  @Column(DataType.STRING)
  declare website: string | null;

  @AllowNull
  @Column(DataType.STRING)
  declare logoUrl: string | null;

  @Default(true)
  @Column
  declare isActive: boolean;

  @ForeignKey(() => UserModel)
  @AllowNull
  @Column(DataType.UUID)
  declare ownerId: string | null;

  @BelongsTo(() => UserModel, { foreignKey: 'ownerId', constraints: false })
  declare owner?: Relation<UserModel> | null;

  @HasMany(() => UserModel, 'organizationId')
  declare users?: UserModel[];

  @BelongsToMany(() => PermissionModel, () => OrganizationPermissionModel)
  declare permissions?: PermissionModel[];
}
