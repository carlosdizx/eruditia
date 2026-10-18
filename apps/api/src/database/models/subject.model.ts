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

// Catálogo de materias del colegio; se reutiliza año a año.
@Table({ tableName: 'subjects', underscored: true, paranoid: true })
export default class SubjectModel extends BaseModel {
  @ForeignKey(() => OrganizationModel)
  @Column(DataType.UUID)
  declare organizationId: string;

  @BelongsTo(() => OrganizationModel, 'organizationId')
  declare organization?: Relation<OrganizationModel>;

  @Column(DataType.STRING(100))
  declare name: string;

  // Ej. "MAT".
  @Column(DataType.STRING(20))
  declare code: string;

  // Área obligatoria a la que pertenece (ej. "Humanidades").
  @AllowNull
  @Column(DataType.STRING(100))
  declare areaName: string | null;
}
