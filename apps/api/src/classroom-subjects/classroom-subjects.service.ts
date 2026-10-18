import {
  BadRequestException,
  ConflictException,
  Injectable,
} from '@nestjs/common';
import { Transaction } from 'sequelize';
import ClassroomSubjectModel from '@database/models/classroom-subject.model';
import AcademicYearModel from '@database/models/academic-year.model';
import ClassroomModel from '@database/models/classroom.model';
import GradeLevelModel from '@database/models/grade-level.model';
import SubjectModel from '@database/models/subject.model';
import UserModel from '@database/models/user.model';
import CrudService from '@database/services/crud.service';
import AcademicYearStatusEnum from '@common/enums/academic-year-status.enum';
import organizationOf, {
  type OrganizationActor,
} from '@common/utils/organization-of.util';
import type AuthContextInterface from '@auth/interfaces/auth-context.interface';
import AcademicYearsService from '../academic-years/academic-years.service';
import ClassroomsService from '../classrooms/classrooms.service';
import SubjectsService from '../subjects/subjects.service';
import UsersService from '../users/users.service';
import { CLOSED_YEAR_CLASSROOMS_MESSAGE } from '../classrooms/constants/classroom-messages.constant';
import ClassroomSubjectRepository from './classroom-subject.repository';
import AssignSubjectDto from './dto/assign-subject.dto';
import UpdateClassroomSubjectDto from './dto/update-classroom-subject.dto';
import CopyStructureDto from './dto/copy-structure.dto';
import {
  INVALID_SUBJECT_TEACHER_MESSAGE,
  SAME_YEAR_COPY_MESSAGE,
  SUBJECT_ALREADY_ASSIGNED_MESSAGE,
} from './constants/classroom-subject-messages.constant';

const TEACHER_ATTRIBUTES = ['id', 'firstName', 'lastName', 'email'];

export const ASSIGNMENT_INCLUDE = [
  { model: SubjectModel, attributes: ['id', 'name', 'code', 'areaName'] },
  { model: UserModel, as: 'teacher', attributes: TEACHER_ATTRIBUTES },
];

type TeacherActor = Pick<AuthContextInterface, 'organizationId' | 'userId'>;

@Injectable()
export default class ClassroomSubjectsService extends CrudService<
  ClassroomSubjectModel,
  ClassroomSubjectRepository
> {
  constructor(
    protected readonly repository: ClassroomSubjectRepository,
    private readonly classroomsService: ClassroomsService,
    private readonly academicYearsService: AcademicYearsService,
    private readonly subjectsService: SubjectsService,
    private readonly usersService: UsersService,
  ) {
    super(repository);
  }

  // Un salón de otra organización responde 404. Con editable, además exige
  // que su año siga abierto.
  private findOwnClassroom = async (
    organizationId: string,
    classroomId: string,
    editable: boolean,
  ) => {
    const classroom = (await this.classroomsService.findOne(
      { id: classroomId, organizationId },
      true,
      {
        attributes: ['id', 'academicYearId'],
        include: [{ model: AcademicYearModel, attributes: ['id', 'status'] }],
      },
    ))!;

    if (
      editable &&
      classroom.academicYear?.status === AcademicYearStatusEnum.CLOSED
    )
      throw new ConflictException(CLOSED_YEAR_CLASSROOMS_MESSAGE);

    return classroom;
  };

  private assertTeacher = async (organizationId: string, teacherId: string) => {
    const [teacher] = await this.usersService.findOrganizationTeachers(
      organizationId,
      [teacherId],
    );
    if (!teacher)
      throw new BadRequestException(INVALID_SUBJECT_TEACHER_MESSAGE);
  };

  private findAssignment = async (classroomId: string, assignmentId: string) =>
    (await this.findOne({ id: assignmentId, classroomId }, true, {
      include: ASSIGNMENT_INCLUDE,
    }))!;

  public listClassroomSubjects = async (
    actor: OrganizationActor,
    classroomId: string,
  ) => {
    const classroom = await this.findOwnClassroom(
      organizationOf(actor),
      classroomId,
      false,
    );

    return await this.findAll(
      { classroomId: classroom.id },
      {
        include: ASSIGNMENT_INCLUDE,
        order: [[{ model: SubjectModel, as: 'subject' }, 'name', 'ASC']],
      },
    );
  };

  public assignSubject = async (
    actor: OrganizationActor,
    classroomId: string,
    dto: AssignSubjectDto,
  ) => {
    const organizationId = organizationOf(actor);
    const classroom = await this.findOwnClassroom(
      organizationId,
      classroomId,
      true,
    );

    await this.subjectsService.findOne(
      { id: dto.subjectId, organizationId },
      true,
      { attributes: ['id'] },
    );
    if (dto.teacherId) await this.assertTeacher(organizationId, dto.teacherId);

    const existing = await this.findOne(
      { classroomId: classroom.id, subjectId: dto.subjectId },
      false,
      { attributes: ['id'] },
    );
    if (existing) throw new ConflictException(SUBJECT_ALREADY_ASSIGNED_MESSAGE);

    const assignment = await this.create({
      ...dto,
      classroomId: classroom.id,
      organizationId,
    });

    return await this.findAssignment(classroom.id, assignment.id);
  };

  public updateClassroomSubject = async (
    actor: OrganizationActor,
    classroomId: string,
    assignmentId: string,
    dto: UpdateClassroomSubjectDto,
  ) => {
    const organizationId = organizationOf(actor);
    const classroom = await this.findOwnClassroom(
      organizationId,
      classroomId,
      true,
    );
    const assignment = (await this.findOne(
      { id: assignmentId, classroomId: classroom.id },
      true,
      { attributes: ['id', 'teacherId'] },
    ))!;

    // Si el docente no cambia no se revalida (pudo quedar inactivo).
    if (dto.teacherId && dto.teacherId !== assignment.teacherId)
      await this.assertTeacher(organizationId, dto.teacherId);

    await this.updateByPk(assignment.id, dto);

    return await this.findAssignment(classroom.id, assignment.id);
  };

  public removeClassroomSubject = async (
    actor: OrganizationActor,
    classroomId: string,
    assignmentId: string,
  ) => {
    const classroom = await this.findOwnClassroom(
      organizationOf(actor),
      classroomId,
      true,
    );
    const assignment = (await this.findOne(
      { id: assignmentId, classroomId: classroom.id },
      true,
      { attributes: ['id'] },
    ))!;

    await this.deleteByPk(assignment.id);
  };

  // Lo que dicta el profesor en sesión: solo sus salones y materias.
  public listMyAssignments = async (
    actor: TeacherActor,
    academicYearId?: string,
  ) => {
    const organizationId = organizationOf(actor);

    const academicYear = await this.academicYearsService.findOne(
      academicYearId
        ? { id: academicYearId, organizationId }
        : { organizationId, isActive: true },
      !!academicYearId,
      { attributes: ['id', 'name', 'status'] },
    );
    if (!academicYear)
      return { academicYear: null, assignments: [], homerooms: [] };

    // Salones donde es director de grupo, aunque no dicte materias en ellos.
    const homerooms = await this.classroomsService.findAll(
      {
        organizationId,
        academicYearId: academicYear.id,
        homeroomTeacherId: actor.userId,
      },
      {
        attributes: ['id', 'name'],
        include: [
          {
            model: GradeLevelModel,
            attributes: ['id', 'name', 'shortName', 'sequenceOrder'],
          },
        ],
        order: [
          [
            { model: GradeLevelModel, as: 'gradeLevel' },
            'sequenceOrder',
            'ASC',
          ],
          ['name', 'ASC'],
        ],
      },
    );

    const assignments = await this.findAll(
      { organizationId, teacherId: actor.userId },
      {
        include: [
          {
            model: SubjectModel,
            attributes: ['id', 'name', 'code', 'areaName'],
          },
          {
            model: ClassroomModel,
            attributes: ['id', 'name'],
            where: { academicYearId: academicYear.id },
            required: true,
            include: [
              {
                model: GradeLevelModel,
                attributes: ['id', 'name', 'shortName', 'sequenceOrder'],
              },
            ],
          },
        ],
        order: [
          [
            { model: ClassroomModel, as: 'classroom' },
            { model: GradeLevelModel, as: 'gradeLevel' },
            'sequenceOrder',
            'ASC',
          ],
          [{ model: ClassroomModel, as: 'classroom' }, 'name', 'ASC'],
          [{ model: SubjectModel, as: 'subject' }, 'name', 'ASC'],
        ],
      },
    );

    return { academicYear, assignments, homerooms };
  };

  // Copia los salones (con director) y su carga académica de un año a otro.
  // Omite los salones cuyo nombre ya exista en el destino y deja sin docente
  // a quien ya no sea un profesor activo.
  public copyStructure = async (
    actor: OrganizationActor,
    { sourceAcademicYearId, targetAcademicYearId }: CopyStructureDto,
  ) => {
    const organizationId = organizationOf(actor);
    if (sourceAcademicYearId === targetAcademicYearId)
      throw new BadRequestException(SAME_YEAR_COPY_MESSAGE);

    await this.academicYearsService.findOne(
      { id: sourceAcademicYearId, organizationId },
      true,
      { attributes: ['id'] },
    );
    const target = (await this.academicYearsService.findOne(
      { id: targetAcademicYearId, organizationId },
      true,
      { attributes: ['id', 'status'] },
    ))!;
    if (target.status === AcademicYearStatusEnum.CLOSED)
      throw new ConflictException(CLOSED_YEAR_CLASSROOMS_MESSAGE);

    const [sourceClassrooms, targetClassrooms, teachers] = await Promise.all([
      this.classroomsService.findAll(
        { organizationId, academicYearId: sourceAcademicYearId },
        {
          attributes: [
            'id',
            'gradeLevelId',
            'name',
            'homeroomTeacherId',
            'capacity',
          ],
        },
      ),
      this.classroomsService.findAll(
        { organizationId, academicYearId: targetAcademicYearId },
        { attributes: ['name'] },
      ),
      this.usersService.findOrganizationTeachers(organizationId),
    ]);

    const usedNames = new Set(
      targetClassrooms.map(({ name }) => name.toUpperCase()),
    );
    const toCopy = sourceClassrooms.filter(
      ({ name }) => !usedNames.has(name.toUpperCase()),
    );
    const skipped = sourceClassrooms
      .filter(({ name }) => usedNames.has(name.toUpperCase()))
      .map(({ name }) => name);

    if (!toCopy.length) return { classrooms: 0, subjects: 0, skipped };

    const activeTeachers = new Set(teachers.map(({ id }) => id));
    const activeOrNull = (teacherId: string | null) =>
      teacherId && activeTeachers.has(teacherId) ? teacherId : null;

    const sourceAssignments = await this.findAll(
      { classroomId: toCopy.map(({ id }) => id) },
      {
        attributes: [
          'classroomId',
          'subjectId',
          'teacherId',
          'weeklyHours',
          'weightInGpa',
        ],
      },
    );

    const copied = await this.transaction(async (transaction: Transaction) => {
      const newIdOf = new Map<string, string>();

      // Uno a uno: el id lo genera la base y hace falta para la carga.
      for (const classroom of toCopy) {
        const created = await this.classroomsService.create(
          {
            organizationId,
            academicYearId: targetAcademicYearId,
            gradeLevelId: classroom.gradeLevelId,
            name: classroom.name,
            capacity: classroom.capacity,
            homeroomTeacherId: activeOrNull(classroom.homeroomTeacherId),
          },
          { transaction },
        );
        newIdOf.set(classroom.id, created.id);
      }

      if (sourceAssignments.length)
        await this.insertMany(
          sourceAssignments.map((assignment) => ({
            organizationId,
            classroomId: newIdOf.get(assignment.classroomId)!,
            subjectId: assignment.subjectId,
            teacherId: activeOrNull(assignment.teacherId),
            weeklyHours: assignment.weeklyHours,
            weightInGpa: assignment.weightInGpa,
          })),
          { transaction },
        );

      return { classrooms: toCopy.length, subjects: sourceAssignments.length };
    });

    return { ...copied, skipped };
  };
}
