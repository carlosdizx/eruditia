import {
  BelongsTo,
  Column,
  CreatedAt,
  DataType,
  Default,
  ForeignKey,
  HasMany,
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
import StudentGradeModel from './student-grade.model';

// Columna de la planilla de una materia en un periodo (ej. "Examen", 40%).
@Table({ tableName: 'evaluation_items', underscored: true })
export default class EvaluationItemModel extends Model {
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

  @Column(DataType.STRING(100))
  declare title: string;

  @Column(decimalColumn('weightPercentage'))
  declare weightPercentage: number;

  @Column(DataType.INTEGER)
  declare sortOrder: number;

  @HasMany(() => StudentGradeModel, 'evaluationItemId')
  declare grades?: StudentGradeModel[];

  @CreatedAt
  declare createdAt: Date;

  @UpdatedAt
  declare updatedAt: Date;
}
