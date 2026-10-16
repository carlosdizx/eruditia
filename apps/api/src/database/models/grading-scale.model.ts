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
import decimalColumn from '@database/util/decimal-column.util';
import OrganizationModel from './organization.model';

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

  @Column(decimalColumn('minScore'))
  declare minScore: number;

  @Column(decimalColumn('maxScore'))
  declare maxScore: number;

  // Desde esta nota (incluida) se aprueba.
  @Column(decimalColumn('passingScore'))
  declare passingScore: number;

  @Column(DataType.SMALLINT)
  declare decimalPlaces: number;

  // Materias reprobadas con las que se reprueba el año; null: no aplica.
  @AllowNull
  @Column(DataType.SMALLINT)
  declare maxFailedSubjects: number | null;

  // También se reprueba con el promedio general bajo la aprobatoria.
  @Default(false)
  @Column(DataType.BOOLEAN)
  declare failByAverage: boolean;

  @CreatedAt
  declare createdAt: Date;

  @UpdatedAt
  declare updatedAt: Date;
}
