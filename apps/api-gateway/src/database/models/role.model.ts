import { Column, DataType, HasMany, Table } from 'sequelize-typescript';
import RoleCategoryEnum from '@common/enums/role-category.enum';
import BaseModel from './base.model';
import UserModel from './user.model';

@Table({ tableName: 'roles', underscored: true, paranoid: true })
export default class RoleModel extends BaseModel {
  @Column(DataType.STRING(100))
  declare label: string;

  @Column(DataType.STRING(100))
  declare labelEs: string;

  @Column(DataType.ENUM(...Object.values(RoleCategoryEnum)))
  declare category: RoleCategoryEnum;

  @HasMany(() => UserModel, 'roleId')
  declare users?: UserModel[];
}
