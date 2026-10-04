import {
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
import RoleModel from './role.model';
import PermissionModel from './permission.model';

@Table({ tableName: 'role_permissions', underscored: true })
export default class RolePermissionModel extends Model {
  @PrimaryKey
  @Default(Sequelize.literal('uuidv7()'))
  @Column(DataType.UUID)
  declare id: string;

  @ForeignKey(() => RoleModel)
  @Column(DataType.UUID)
  declare roleId: string;

  @BelongsTo(() => RoleModel, 'roleId')
  declare role?: Relation<RoleModel>;

  @ForeignKey(() => PermissionModel)
  @Column(DataType.UUID)
  declare permissionId: string;

  @BelongsTo(() => PermissionModel, 'permissionId')
  declare permission?: Relation<PermissionModel>;

  @CreatedAt
  declare createdAt: Date;

  @UpdatedAt
  declare updatedAt: Date;
}
