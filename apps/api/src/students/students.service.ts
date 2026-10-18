import { ConflictException, Injectable } from '@nestjs/common';
import { Op, WhereOptions } from 'sequelize';
import StudentModel from '@database/models/student.model';
import CrudService from '@database/services/crud.service';
import StudentRepository from './student.repository';
import CreateStudentDto from './dto/create-student.dto';
import UpdateStudentDto from './dto/update-student.dto';
import ListStudentsDto from './dto/list-students.dto';
import {
  DOCUMENT_IN_USE_MESSAGE,
  STUDENT_CODE_IN_USE_MESSAGE,
} from './constants/student-messages.constant';
import { DUPLICATED_IN_FILE_MESSAGE } from './constants/students-import.constant';
import {
  parseStudentsCsv,
  toCreateStudentDto,
} from './utils/students-csv.util';
import type { StudentsImportSummary } from './interfaces/students-import-summary.interface';
import organizationOf, {
  type OrganizationActor,
} from '@common/utils/organization-of.util';

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

    const { data, meta } = await this.findAllPaginated(
      dto,
      {
        organizationId: organizationOf(actor),
        ...(status && { status }),
        ...this.searchWhere(search),
      },
      {
        order: [
          ['lastName', 'ASC'],
          ['firstName', 'ASC'],
        ],
      },
    );

    return { data, meta };
  };

  // Un estudiante de otra organización responde 404, igual que uno inexistente.
  public findStudent = async (actor: OrganizationActor, studentId: string) =>
    (await this.findOne(
      { id: studentId, organizationId: organizationOf(actor) },
      true,
    ))!;

  public createStudent = async (
    actor: OrganizationActor,
    dto: CreateStudentDto,
  ) => {
    const organizationId = organizationOf(actor);
    const studentCode = dto.studentCode ?? dto.documentNumber;

    await this.assertUnique(organizationId, {
      documentNumber: dto.documentNumber,
      studentCode,
    });

    return await this.create({ ...dto, studentCode, organizationId });
  };

  public updateStudent = async (
    actor: OrganizationActor,
    studentId: string,
    dto: UpdateStudentDto,
  ) => {
    const organizationId = organizationOf(actor);

    await this.findOne({ id: studentId, organizationId }, true, {
      attributes: ['id'],
    });
    await this.assertUnique(organizationId, dto, studentId);
    await this.updateByPk(studentId, dto);

    return await this.findStudent(actor, studentId);
  };

  // Importa las filas válidas y reporta el resto; una fila con errores no
  // impide que se importen las demás.
  public importStudents = async (
    actor: OrganizationActor,
    content: Buffer,
  ): Promise<StudentsImportSummary> => {
    const organizationId = organizationOf(actor);
    const rows = parseStudentsCsv(content);

    const errors: StudentsImportSummary['errors'] = [];
    const valid: { line: number; dto: CreateStudentDto }[] = [];
    const firstLineOf = new Map<string, number>();

    for (const row of rows) {
      const result = await toCreateStudentDto(row);
      const documentNumber = row.values.documento ?? null;

      if (!result.ok) {
        errors.push({
          line: row.line,
          documentNumber,
          messages: result.messages,
        });
        continue;
      }

      const firstLine = firstLineOf.get(result.dto.documentNumber);
      if (firstLine) {
        errors.push({
          line: row.line,
          documentNumber,
          messages: [DUPLICATED_IN_FILE_MESSAGE(firstLine)],
        });
        continue;
      }

      firstLineOf.set(result.dto.documentNumber, row.line);
      valid.push({ line: row.line, dto: result.dto });
    }

    // El código de los importados es su documento: ambos deben estar libres.
    const documents = valid.map(({ dto }) => dto.documentNumber);
    const existing = documents.length
      ? await this.findAll(
          {
            organizationId,
            [Op.or]: [
              { documentNumber: documents },
              { studentCode: documents },
            ],
          },
          { attributes: ['documentNumber', 'studentCode'] },
        )
      : [];
    const usedDocuments = new Set(existing.map((s) => s.documentNumber));
    const usedCodes = new Set(existing.map((s) => s.studentCode));

    const toCreate = valid.filter(({ line, dto }) => {
      const message = usedDocuments.has(dto.documentNumber)
        ? DOCUMENT_IN_USE_MESSAGE
        : usedCodes.has(dto.documentNumber)
          ? STUDENT_CODE_IN_USE_MESSAGE
          : null;
      if (!message) return true;

      errors.push({
        line,
        documentNumber: dto.documentNumber,
        messages: [message],
      });
      return false;
    });

    if (toCreate.length)
      await this.transaction((transaction) =>
        this.insertMany(
          toCreate.map(({ dto }) => ({
            ...dto,
            studentCode: dto.documentNumber,
            organizationId,
          })),
          { transaction },
        ),
      );

    return {
      total: rows.length,
      created: toCreate.length,
      failed: errors.length,
      errors: errors.sort((a, b) => a.line - b.line),
    };
  };
}
