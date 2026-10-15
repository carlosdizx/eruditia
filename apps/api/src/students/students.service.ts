import {
  ConflictException,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Op, WhereOptions } from 'sequelize';
import StudentModel from '@database/models/student.model';
import CrudService from '@database/services/crud.service';
import type AuthContextInterface from '@auth/interfaces/auth-context.interface';
import { NO_ORGANIZATION_MESSAGE } from '../users/constants/user-messages.constant';
import StudentRepository from './student.repository';
import CreateStudentDto from './dto/create-student.dto';
import UpdateStudentDto from './dto/update-student.dto';
import ListStudentsDto from './dto/list-students.dto';
import {
  DOCUMENT_IN_USE_MESSAGE,
  STUDENT_CODE_IN_USE_MESSAGE,
} from './constants/student-messages.constant';

type OrganizationActor = Pick<AuthContextInterface, 'organizationId'>;

// El hash del PIN nunca sale de la API.
const PUBLIC_ATTRIBUTES = { exclude: ['accessPin'] };

const SEARCHABLE_FIELDS = [
  'firstName',
  'lastName',
  'documentNumber',
  'studentCode',
] as const;

const escapeLike = (value: string) => value.replace(/[\\%_]/g, '\\$&');

@Injectable()
export default class StudentsService extends CrudService<
  StudentModel,
  StudentRepository
> {
  constructor(protected readonly repository: StudentRepository) {
    super(repository);
  }

  private toPublicStudent = (student: StudentModel) => {
    const { accessPin: _accessPin, ...publicStudent } = student;
    return publicStudent as StudentModel;
  };

  private organizationOf = ({ organizationId }: OrganizationActor) => {
    if (!organizationId) throw new ForbiddenException(NO_ORGANIZATION_MESSAGE);
    return organizationId;
  };

  // Cada palabra debe aparecer en alguno de los campos: "ana lopez" encuentra
  // a Ana López aunque nombre y apellido estén en columnas distintas.
  private searchWhere = (search?: string): WhereOptions<StudentModel> => {
    const terms = search?.trim().split(/\s+/).filter(Boolean) ?? [];
    if (!terms.length) return {};

    return {
      [Op.and]: terms.map((term) => ({
        [Op.or]: SEARCHABLE_FIELDS.map((field) => ({
          [field]: { [Op.iLike]: `%${escapeLike(term)}%` },
        })),
      })),
    };
  };

  private assertUnique = async (
    organizationId: string,
    {
      documentNumber,
      studentCode,
    }: Pick<UpdateStudentDto, 'documentNumber' | 'studentCode'>,
    exceptStudentId?: string,
  ) => {
    const candidates = [
      ...(documentNumber ? [{ documentNumber }] : []),
      ...(studentCode ? [{ studentCode }] : []),
    ];
    if (!candidates.length) return;

    const existing = await this.findOne(
      {
        organizationId,
        [Op.or]: candidates,
        ...(exceptStudentId && { id: { [Op.ne]: exceptStudentId } }),
      },
      false,
      { attributes: ['id', 'documentNumber', 'studentCode'] },
    );
    if (!existing) return;

    throw new ConflictException(
      documentNumber && existing.documentNumber === documentNumber
        ? DOCUMENT_IN_USE_MESSAGE
        : STUDENT_CODE_IN_USE_MESSAGE,
    );
  };

  public listStudents = async (
    actor: OrganizationActor,
    dto: ListStudentsDto,
  ) => {
    const { status, search } = dto;

    return await this.findAllPaginated(
      dto,
      {
        organizationId: this.organizationOf(actor),
        ...(status && { status }),
        ...this.searchWhere(search),
      },
      {
        attributes: PUBLIC_ATTRIBUTES,
        order: [
          ['lastName', 'ASC'],
          ['firstName', 'ASC'],
        ],
      },
    );
  };

  // Un estudiante de otra organización responde 404, igual que uno inexistente.
  public findStudent = async (actor: OrganizationActor, studentId: string) => {
    return (await this.findOne(
      { id: studentId, organizationId: this.organizationOf(actor) },
      true,
      { attributes: PUBLIC_ATTRIBUTES },
    ))!;
  };

  public createStudent = async (
    actor: OrganizationActor,
    dto: CreateStudentDto,
  ) => {
    const organizationId = this.organizationOf(actor);
    const studentCode = dto.studentCode ?? dto.documentNumber;

    await this.assertUnique(organizationId, {
      documentNumber: dto.documentNumber,
      studentCode,
    });

    return this.toPublicStudent(
      await this.create({ ...dto, studentCode, organizationId }),
    );
  };

  public updateStudent = async (
    actor: OrganizationActor,
    studentId: string,
    dto: UpdateStudentDto,
  ) => {
    const organizationId = this.organizationOf(actor);

    await this.findOne({ id: studentId, organizationId }, true, {
      attributes: ['id'],
    });
    await this.assertUnique(organizationId, dto, studentId);

    return this.toPublicStudent((await this.updateByPk(studentId, dto))!);
  };
}
