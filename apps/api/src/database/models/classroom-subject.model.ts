import {
  AllowNull,
  BelongsTo,
  Column,
  DataType,
  Default,
  ForeignKey,
  Table,
} from 'sequelize-typescript';
import BaseModel from './base.model';
import type { Relation } from '@database/types/relation.type';
import OrganizationModel from './organization.model';
import ClassroomModel from './classroom.model';
import SubjectModel from './subject.model';
import UserModel from './user.model';

// Carga académica: qué materia se dicta en qué salón y quién la dicta.
@Table({ tableName: 'classroom_subjects', underscored: true, paranoid: true })
export default class ClassroomSubjectModel extends BaseModel {
  @ForeignKey(() => OrganizationModel)
  @Column(DataType.UUID)
  declare organizationId: string;

  @ForeignKey(() => ClassroomModel)
  @Column(DataType.UUID)
  declare classroomId: string;

  @BelongsTo(() => ClassroomModel, 'classroomId')
  declare classroom?: Relation<ClassroomModel>;

  @ForeignKey(() => SubjectModel)
  @Column(DataType.UUID)
  declare subjectId: string;

  @BelongsTo(() => SubjectModel, 'subjectId')
  declare subject?: Relation<SubjectModel>;

  @ForeignKey(() => UserModel)
  @AllowNull
  @Column(DataType.UUID)
  declare teacherId: string | null;

  @BelongsTo(() => UserModel, 'teacherId')
  declare teacher?: Relation<UserModel>;

  @AllowNull
  @Column(DataType.INTEGER)
  declare weeklyHours: number | null;

  // Peso de la materia en el promedio general. Postgres devuelve DECIMAL como
  // string; se expone como número.
  @Default(1)
  @Column({
    type: DataType.DECIMAL(4, 2),
    get(this: ClassroomSubjectModel) {
      const value: unknown = this.getDataValue('weightInGpa');
      return value === null || value === undefined ? value : Number(value);
    },
  })
  declare weightInGpa: number;
}
