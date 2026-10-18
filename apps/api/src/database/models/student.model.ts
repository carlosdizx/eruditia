import {
  AllowNull,
  BelongsTo,
  Column,
  DataType,
  Default,
  ForeignKey,
  Table,
} from 'sequelize-typescript';
import StudentStatusEnum from '@common/enums/student-status.enum';
import StudentDocumentTypeEnum from '@common/enums/student-document-type.enum';
import BaseModel from './base.model';
import type { Relation } from '@database/types/relation.type';
import OrganizationModel from './organization.model';
import UserModel from './user.model';

// Ficha académica: independiente de la cuenta de acceso (userId es opcional),
// así se pueden matricular niños sin correo.
@Table({ tableName: 'students', underscored: true, paranoid: true })
export default class StudentModel extends BaseModel {
  @ForeignKey(() => OrganizationModel)
  @Column(DataType.UUID)
  declare organizationId: string;

  @BelongsTo(() => OrganizationModel, 'organizationId')
  declare organization?: Relation<OrganizationModel>;

  @ForeignKey(() => UserModel)
  @AllowNull
  @Column(DataType.UUID)
  declare userId: string | null;

  @BelongsTo(() => UserModel, 'userId')
  declare user?: Relation<UserModel>;

  @Column(DataType.STRING(30))
  declare studentCode: string;

  @Column(DataType.ENUM(...Object.values(StudentDocumentTypeEnum)))
  declare documentType: StudentDocumentTypeEnum;

  @Column(DataType.STRING(30))
  declare documentNumber: string;

  @Column(DataType.STRING(100))
  declare firstName: string;

  @Column(DataType.STRING(100))
  declare lastName: string;

  @AllowNull
  @Column(DataType.DATEONLY)
  declare birthDate: string | null;

  @AllowNull
  @Column(DataType.STRING(200))
  declare guardianName: string | null;

  @AllowNull
  @Column(DataType.STRING(20))
  declare guardianPhone: string | null;

  @AllowNull
  @Column(DataType.STRING)
  declare guardianEmail: string | null;

  @Default(StudentStatusEnum.ACTIVE)
  @Column(DataType.ENUM(...Object.values(StudentStatusEnum)))
  declare status: StudentStatusEnum;
}
