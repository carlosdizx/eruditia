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
import ClassroomSubjectModel from './classroom-subject.model';
import AcademicPeriodModel from './academic-period.model';

// Definitiva de la materia en el periodo. Se recalcula al guardar notas y es
// la base de boletines y rankings.
@Table({ tableName: 'period_subject_summaries', underscored: true })
export default class PeriodSubjectSummaryModel extends Model {
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

  @ForeignKey(() => ClassroomSubjectModel)
  @Column(DataType.UUID)
  declare classroomSubjectId: string;

  @BelongsTo(() => ClassroomSubjectModel, 'classroomSubjectId')
  declare classroomSubject?: Relation<ClassroomSubjectModel>;

  @ForeignKey(() => AcademicPeriodModel)
  @Column(DataType.UUID)
  declare academicPeriodId: string;

  @BelongsTo(() => AcademicPeriodModel, 'academicPeriodId')
  declare academicPeriod?: Relation<AcademicPeriodModel>;

  @AllowNull
  @Column(decimalColumn('finalPeriodScore'))
  declare finalPeriodScore: number | null;

  @AllowNull
  @Column(DataType.TEXT)
  declare teacherObservation: string | null;

  @AllowNull
  @Column(DataType.BOOLEAN)
  declare isPassed: boolean | null;

  @CreatedAt
  declare createdAt: Date;

  @UpdatedAt
  declare updatedAt: Date;
}
