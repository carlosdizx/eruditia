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
import UserModel from './user.model';

// Recuperación de una materia perdida: su nota reemplaza el acumulado anual
// de la materia (una por estudiante y materia).
@Table({ tableName: 'subject_recoveries', underscored: true })
export default class SubjectRecoveryModel extends Model {
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

  @Column(decimalColumn('score'))
  declare score: number;

  @AllowNull
  @Column(DataType.TEXT)
  declare notes: string | null;

  @ForeignKey(() => UserModel)
  @AllowNull
  @Column(DataType.UUID)
  declare recordedBy: string | null;

  @CreatedAt
  declare createdAt: Date;

  @UpdatedAt
  declare updatedAt: Date;
}
