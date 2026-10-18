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
import OrganizationModel from './organization.model';
import PermissionModel from './permission.model';

@Table({ tableName: 'organization_permissions', underscored: true })
export default class OrganizationPermissionModel extends Model {
  @PrimaryKey
  @Default(Sequelize.literal('uuidv7()'))
  @Column(DataType.UUID)
  declare id: string;

  @ForeignKey(() => OrganizationModel)
  @Column(DataType.UUID)
  declare organizationId: string;

  @BelongsTo(() => OrganizationModel, 'organizationId')
  declare organization?: Relation<OrganizationModel>;

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
