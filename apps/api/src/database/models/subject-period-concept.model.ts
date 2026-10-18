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
import ClassroomSubjectModel from './classroom-subject.model';
import AcademicPeriodModel from './academic-period.model';
import UserModel from './user.model';

// Concepto evaluativo de una materia en un periodo para las definitivas entre
// minScore y maxScore (inclusive). Los rangos de una planilla no se cruzan.
@Table({ tableName: 'subject_period_concepts', underscored: true })
export default class SubjectPeriodConceptModel extends Model {
  @PrimaryKey
  @Default(Sequelize.literal('uuidv7()'))
  @Column(DataType.UUID)
  declare id: string;

  @ForeignKey(() => OrganizationModel)
  @Column(DataType.UUID)
  declare organizationId: string;

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

  @Column(decimalColumn('minScore'))
  declare minScore: number;

  @Column(decimalColumn('maxScore'))
  declare maxScore: number;

  @Column(DataType.TEXT)
  declare conceptText: string;

  @ForeignKey(() => UserModel)
  @AllowNull
  @Column(DataType.UUID)
  declare updatedBy: string | null;

  @CreatedAt
  declare createdAt: Date;

  @UpdatedAt
  declare updatedAt: Date;
}
