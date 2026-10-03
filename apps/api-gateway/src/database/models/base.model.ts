import {
  Column,
  CreatedAt,
  DataType,
  Default,
  DeletedAt,
  Model,
  PrimaryKey,
  Sequelize,
  UpdatedAt,
} from 'sequelize-typescript';

export default abstract class BaseModel<
  TModelAttributes extends object = any,
  TCreationAttributes extends object = TModelAttributes,
> extends Model<TModelAttributes, TCreationAttributes> {
  @PrimaryKey
  @Default(Sequelize.literal('uuidv7()'))
  @Column(DataType.UUID)
  declare id: string;

  @CreatedAt
  declare createdAt: Date;

  @UpdatedAt
  declare updatedAt: Date;

  @DeletedAt
  declare deletedAt: Date | null;
}
