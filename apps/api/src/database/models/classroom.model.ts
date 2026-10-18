import {
  AllowNull,
  BelongsTo,
  Column,
  DataType,
  ForeignKey,
  Table,
} from 'sequelize-typescript';
import BaseModel from './base.model';
import type { Relation } from '@database/types/relation.type';
import OrganizationModel from './organization.model';
import AcademicYearModel from './academic-year.model';
import GradeLevelModel from './grade-level.model';
import UserModel from './user.model';

// Salón (grupo/curso) de un grado en un año lectivo concreto.
@Table({ tableName: 'classrooms', underscored: true, paranoid: true })
export default class ClassroomModel extends BaseModel {
  @ForeignKey(() => OrganizationModel)
  @Column(DataType.UUID)
  declare organizationId: string;

  @ForeignKey(() => AcademicYearModel)
  @Column(DataType.UUID)
  declare academicYearId: string;

  @BelongsTo(() => AcademicYearModel, 'academicYearId')
  declare academicYear?: Relation<AcademicYearModel>;

  @ForeignKey(() => GradeLevelModel)
  @Column(DataType.UUID)
  declare gradeLevelId: string;

  @BelongsTo(() => GradeLevelModel, 'gradeLevelId')
  declare gradeLevel?: Relation<GradeLevelModel>;

  // Ej. "1°A".
  @Column(DataType.STRING(30))
  declare name: string;

  // Director de grupo: un profesor de la organización.
  @ForeignKey(() => UserModel)
  @AllowNull
  @Column(DataType.UUID)
  declare homeroomTeacherId: string | null;

  @BelongsTo(() => UserModel, 'homeroomTeacherId')
  declare homeroomTeacher?: Relation<UserModel>;

  @AllowNull
  @Column(DataType.INTEGER)
  declare capacity: number | null;
}
