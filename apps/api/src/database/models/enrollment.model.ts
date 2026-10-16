import {
  AllowNull,
  BelongsTo,
  Column,
  DataType,
  Default,
  ForeignKey,
  Table,
} from 'sequelize-typescript';
import EnrollmentStatusEnum from '@common/enums/enrollment-status.enum';
import BaseModel from './base.model';
import type { Relation } from '@database/types/relation.type';
import OrganizationModel from './organization.model';
import StudentModel from './student.model';
import AcademicYearModel from './academic-year.model';
import ClassroomModel from './classroom.model';
import UserModel from './user.model';

// Matrícula de un estudiante en un salón durante un año lectivo. El historial
// del estudiante son sus matrículas: al pasar de año se crea una nueva y la
// anterior queda cerrada con su estado final.
@Table({ tableName: 'enrollments', underscored: true, paranoid: true })
export default class EnrollmentModel extends BaseModel {
  @ForeignKey(() => OrganizationModel)
  @Column(DataType.UUID)
  declare organizationId: string;

  @ForeignKey(() => StudentModel)
  @Column(DataType.UUID)
  declare studentId: string;

  @BelongsTo(() => StudentModel, 'studentId')
  declare student?: Relation<StudentModel>;

  @ForeignKey(() => AcademicYearModel)
  @Column(DataType.UUID)
  declare academicYearId: string;

  @BelongsTo(() => AcademicYearModel, 'academicYearId')
  declare academicYear?: Relation<AcademicYearModel>;

  // Si cambia de salón en el mismo año se actualiza aquí.
  @ForeignKey(() => ClassroomModel)
  @Column(DataType.UUID)
  declare classroomId: string;

  @BelongsTo(() => ClassroomModel, 'classroomId')
  declare classroom?: Relation<ClassroomModel>;

  @Column(DataType.DATEONLY)
  declare enrollmentDate: string;

  @Default(EnrollmentStatusEnum.IN_PROGRESS)
  @Column(DataType.ENUM(...Object.values(EnrollmentStatusEnum)))
  declare status: EnrollmentStatusEnum;

  // Postgres devuelve DECIMAL como string; se expone como número.
  @AllowNull
  @Column({
    type: DataType.DECIMAL(5, 2),
    get(this: EnrollmentModel) {
      const value: unknown = this.getDataValue('finalAverage');
      return value === null || value === undefined ? value : Number(value);
    },
  })
  declare finalAverage: number | null;

  // Promedio calculado de las planillas al promover. Si difiere de
  // finalAverage, lo ajustó averageAdjustedBy (el motivo va en promotionNotes).
  @AllowNull
  @Column({
    type: DataType.DECIMAL(5, 2),
    get(this: EnrollmentModel) {
      const value: unknown = this.getDataValue('computedAverage');
      return value === null || value === undefined ? value : Number(value);
    },
  })
  declare computedAverage: number | null;

  @ForeignKey(() => UserModel)
  @AllowNull
  @Column(DataType.UUID)
  declare averageAdjustedBy: string | null;

  @AllowNull
  @Column(DataType.TEXT)
  declare promotionNotes: string | null;

  // Matrícula del año anterior de la que viene (trazabilidad de la promoción).
  @ForeignKey(() => EnrollmentModel)
  @AllowNull
  @Column(DataType.UUID)
  declare promotedFromEnrollmentId: string | null;

  @BelongsTo(() => EnrollmentModel, 'promotedFromEnrollmentId')
  declare promotedFrom?: Relation<EnrollmentModel>;
}
