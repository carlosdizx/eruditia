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

// Postgres devuelve DECIMAL como string; se expone como número.
const decimal = (field: string) => ({
  type: DataType.DECIMAL(5, 2),
  get(this: Model) {
    const value: unknown = this.getDataValue(field);
    return value === null || value === undefined ? value : Number(value);
  },
});

// Escala de notas del colegio: una por organización.
@Table({ tableName: 'grading_scales', underscored: true })
export default class GradingScaleModel extends Model {
  @PrimaryKey
  @Default(Sequelize.literal('uuidv7()'))
  @Column(DataType.UUID)
  declare id: string;

  @ForeignKey(() => OrganizationModel)
  @Column(DataType.UUID)
  declare organizationId: string;

  @BelongsTo(() => OrganizationModel, 'organizationId')
  declare organization?: Relation<OrganizationModel>;

  @Column(decimal('minScore'))
  declare minScore: number;

  @Column(decimal('maxScore'))
  declare maxScore: number;

  // Desde esta nota (incluida) se aprueba.
  @Column(decimal('passingScore'))
  declare passingScore: number;

  @Column(DataType.SMALLINT)
  declare decimalPlaces: number;

  @CreatedAt
  declare createdAt: Date;

  @UpdatedAt
  declare updatedAt: Date;
}
