import {
  AllowNull,
  Column,
  DataType,
  Default,
  Table,
} from 'sequelize-typescript';
import BaseModel from './base.model';

@Table({ tableName: 'examples', underscored: true, paranoid: true })
export default class ExampleModel extends BaseModel {
  @Column
  declare title: string;

  @AllowNull
  @Column(DataType.STRING)
  declare description: string | null;

  @Default(true)
  @Column
  declare isActive: boolean;
}
