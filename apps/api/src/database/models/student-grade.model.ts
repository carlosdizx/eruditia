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
import EnrollmentModel from './enrollment.model';
import EvaluationItemModel from './evaluation-item.model';
import UserModel from './user.model';

// Nota de un estudiante en una actividad.
@Table({ tableName: 'student_grades', underscored: true })
export default class StudentGradeModel extends Model {
  @PrimaryKey
  @Default(Sequelize.literal('uuidv7()'))
  @Column(DataType.UUID)
  declare id: string;

  @ForeignKey(() => OrganizationModel)
  @Column(DataType.UUID)
  declare organizationId: string;

  @ForeignKey(() => EnrollmentModel)
  @Column(DataType.UUID)
  declare enrollmentId: string;

  @BelongsTo(() => EnrollmentModel, 'enrollmentId')
  declare enrollment?: Relation<EnrollmentModel>;

  @ForeignKey(() => EvaluationItemModel)
  @Column(DataType.UUID)
  declare evaluationItemId: string;

  @BelongsTo(() => EvaluationItemModel, 'evaluationItemId')
  declare evaluationItem?: Relation<EvaluationItemModel>;

  @Column(decimalColumn('score'))
  declare score: number;

  @AllowNull
  @Column(DataType.TEXT)
  declare feedback: string | null;

  @ForeignKey(() => UserModel)
  @AllowNull
  @Column(DataType.UUID)
  declare updatedBy: string | null;

  @CreatedAt
  declare createdAt: Date;

  @UpdatedAt
  declare updatedAt: Date;
}
