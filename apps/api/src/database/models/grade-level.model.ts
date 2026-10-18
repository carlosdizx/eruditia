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

// Catálogo de grados del colegio; se reutiliza año a año.
@Table({ tableName: 'grade_levels', underscored: true, paranoid: true })
export default class GradeLevelModel extends BaseModel {
  @ForeignKey(() => OrganizationModel)
  @Column(DataType.UUID)
  declare organizationId: string;

  @BelongsTo(() => OrganizationModel, 'organizationId')
  declare organization?: Relation<OrganizationModel>;

  @Column(DataType.STRING(50))
  declare name: string;

  // Ej. "1°", usado para nombrar salones ("1°A").
  @Column(DataType.STRING(10))
  declare shortName: string;

  // Al terminar el año se promueve al grado con sequenceOrder + 1.
  @Column(DataType.INTEGER)
  declare sequenceOrder: number;

  // Último grado: al aprobarlo el estudiante se gradúa.
  @Default(false)
  @Column
  declare isFinalGrade: boolean;
}
