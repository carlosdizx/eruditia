import {
  AllowNull,
  BelongsToMany,
  Column,
  CreatedAt,
  DataType,
  Default,
  Model,
  PrimaryKey,
  Sequelize,
  Table,
  Unique,
  UpdatedAt,
} from 'sequelize-typescript';
import RoleModel from './role.model';
import OrganizationModel from './organization.model';
import RolePermissionModel from './role-permission.model';
import OrganizationPermissionModel from './organization-permission.model';

@Table({ tableName: 'permissions', underscored: true })
export default class PermissionModel extends Model {
  @PrimaryKey
  @Default(Sequelize.literal('uuidv7()'))
  @Column(DataType.UUID)
  declare id: string;

  @Unique('permissions_key_unique')
  @Column(DataType.STRING(100))
  declare key: string;

  @Column(DataType.STRING(50))
  declare resource: string;

  @Column(DataType.STRING(50))
  declare action: string;

  @AllowNull
  @Column(DataType.STRING)
  declare description: string | null;

  @CreatedAt
  declare createdAt: Date;

  @UpdatedAt
  declare updatedAt: Date;

  @BelongsToMany(() => RoleModel, () => RolePermissionModel)
  declare roles?: RoleModel[];

  @BelongsToMany(() => OrganizationModel, () => OrganizationPermissionModel)
  declare organizations?: OrganizationModel[];
}
