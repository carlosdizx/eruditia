import {
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
import AcademicYearModel from './academic-year.model';

@Table({ tableName: 'academic_periods', underscored: true, paranoid: true })
export default class AcademicPeriodModel extends BaseModel {
  @ForeignKey(() => OrganizationModel)
  @Column(DataType.UUID)
  declare organizationId: string;

  @ForeignKey(() => AcademicYearModel)
  @Column(DataType.UUID)
  declare academicYearId: string;

  @BelongsTo(() => AcademicYearModel, 'academicYearId')
  declare academicYear?: Relation<AcademicYearModel>;

  @Column(DataType.STRING(50))
  declare name: string;

  // 1, 2, 3...: orden dentro del año.
  @Column(DataType.INTEGER)
  declare orderIndex: number;

  // Postgres devuelve DECIMAL como string; se expone como número.
  @Column({
    type: DataType.DECIMAL(5, 2),
    get(this: AcademicPeriodModel) {
      const value: unknown = this.getDataValue('weightPercentage');
      return value === null || value === undefined ? value : Number(value);
    },
  })
  declare weightPercentage: number;

  @Default(false)
  @Column
  declare isOpenForGrading: boolean;
}
