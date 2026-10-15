import {
  BelongsTo,
  Column,
  DataType,
  Default,
  ForeignKey,
  HasMany,
  Table,
} from 'sequelize-typescript';
import AcademicYearStatusEnum from '@common/enums/academic-year-status.enum';
import BaseModel from './base.model';
import type { Relation } from '@database/types/relation.type';
import OrganizationModel from './organization.model';
import AcademicPeriodModel from './academic-period.model';

// Las notas y salones cuelgan de un año para conservar el historial.
@Table({ tableName: 'academic_years', underscored: true, paranoid: true })
export default class AcademicYearModel extends BaseModel {
  @ForeignKey(() => OrganizationModel)
  @Column(DataType.UUID)
  declare organizationId: string;

  @BelongsTo(() => OrganizationModel, 'organizationId')
  declare organization?: Relation<OrganizationModel>;

  @Column(DataType.STRING(50))
  declare name: string;

  @Column(DataType.DATEONLY)
  declare startDate: string;

  @Column(DataType.DATEONLY)
  declare endDate: string;

  // El que el selector global muestra por defecto.
  @Default(false)
  @Column
  declare isActive: boolean;

  @Default(AcademicYearStatusEnum.OPEN)
  @Column(DataType.ENUM(...Object.values(AcademicYearStatusEnum)))
  declare status: AcademicYearStatusEnum;

  @HasMany(() => AcademicPeriodModel, 'academicYearId')
  declare periods?: AcademicPeriodModel[];
}
