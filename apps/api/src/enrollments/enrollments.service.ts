import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Op, Transaction } from 'sequelize';
import EnrollmentModel from '@database/models/enrollment.model';
import AcademicYearModel from '@database/models/academic-year.model';
import ClassroomModel from '@database/models/classroom.model';
import GradeLevelModel from '@database/models/grade-level.model';
import StudentModel from '@database/models/student.model';
import CrudService from '@database/services/crud.service';
import AcademicYearStatusEnum from '@common/enums/academic-year-status.enum';
import EnrollmentStatusEnum from '@common/enums/enrollment-status.enum';
import StudentStatusEnum from '@common/enums/student-status.enum';
import RoleNameEnum from '@common/enums/role-name.enum';
import type AuthContextInterface from '@auth/interfaces/auth-context.interface';
import organizationOf, {
  type OrganizationActor,
} from '@common/utils/organization-of.util';
import ClassroomsService from '../classrooms/classrooms.service';
import StudentsService from '../students/students.service';
import ClassroomSubjectRepository from '../classroom-subjects/classroom-subject.repository';
import { CLASSROOM_NOT_FOUND_MESSAGE } from '../classrooms/constants/classroom-messages.constant';
import { STUDENT_NOT_FOUND_MESSAGE } from '../students/constants/student-messages.constant';
import EnrollmentRepository from './enrollment.repository';
import EnrollStudentsDto from './dto/enroll-students.dto';
import UpdateEnrollmentDto from './dto/update-enrollment.dto';
import {
  ALREADY_ENROLLED_MESSAGE,
  CLASSROOM_FULL_MESSAGE,
  CLOSED_YEAR_ENROLLMENTS_MESSAGE,
  INVALID_STUDENTS_MESSAGE,
  NOT_IN_PROGRESS_MESSAGE,
  OTHER_YEAR_CLASSROOM_MESSAGE,
} from './constants/enrollment-messages.constant';

export const STUDENT_ATTRIBUTES = [
  'id',
  'studentCode',
  'documentType',
  'documentNumber',
  'firstName',
  'lastName',
  'status',
];

const ENROLLMENT_INCLUDE = [
  { model: StudentModel, attributes: STUDENT_ATTRIBUTES },
];

const fullName = ({ firstName, lastName }: StudentModel) =>
  `${firstName} ${lastName}`;

// Año y salón (con su grado) de cada matrícula del historial.
const HISTORY_INCLUDE = [
  {
    model: AcademicYearModel,
    attributes: ['id', 'name', 'startDate', 'endDate', 'status'],
  },
  {
    model: ClassroomModel,
    attributes: ['id', 'name', 'homeroomTeacherId'],
    include: [
      {
        model: GradeLevelModel,
        attributes: [
          'id',
          'name',
          'shortName',
          'sequenceOrder',
          'isFinalGrade',
        ],
      },
    ],
  },
];

// Admin o profesor: el profesor solo ve lo de los salones donde dicta.
type Viewer = Pick<
  AuthContextInterface,
  'organizationId' | 'userId' | 'roleName'
>;

// Fecha local del servidor (AAAA-MM-DD), no la UTC.
export const today = () => new Date().toLocaleDateString('en-CA');

@Injectable()
export default class EnrollmentsService extends CrudService<
  EnrollmentModel,
  EnrollmentRepository
> {
  constructor(
    protected readonly repository: EnrollmentRepository,
    private readonly classroomsService: ClassroomsService,
    private readonly studentsService: StudentsService,
    private readonly classroomSubjectRepository: ClassroomSubjectRepository,
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
        attributes: ['id', 'academicYearId', 'capacity'],
        include: [{ model: AcademicYearModel, attributes: ['id', 'status'] }],
      },
    ))!;

    if (
      editable &&
      classroom.academicYear?.status === AcademicYearStatusEnum.CLOSED
    )
      throw new ConflictException(CLOSED_YEAR_ENROLLMENTS_MESSAGE);

    return classroom;
  };

  private assertCapacity = async (
    classroom: { id: string; capacity: number | null },
    incoming: number,
  ) => {
    if (!classroom.capacity) return;

    const enrolled = await this.findAll(
      { classroomId: classroom.id, status: EnrollmentStatusEnum.IN_PROGRESS },
      { attributes: ['id'] },
    );
    if (enrolled.length + incoming > classroom.capacity)
      throw new ConflictException(CLASSROOM_FULL_MESSAGE(classroom.capacity));
  };

  // Ids de los estudiantes que ya cursan algún salón del año.
  private enrolledStudentIds = async (
    academicYearId: string,
    studentIds?: string[],
  ) => {
    const enrollments = await this.findAll(
      {
        academicYearId,
        status: EnrollmentStatusEnum.IN_PROGRESS,
        ...(studentIds && { studentId: studentIds }),
      },
      { attributes: ['studentId'] },
    );
    return enrollments.map(({ studentId }) => studentId);
  };

  // El profesor debe ser director de grupo o dictar alguna materia en alguno
  // de los salones; si no, 404 para no revelar que existen.
  private assertTeaches = async (
    { userId, roleName }: Viewer,
    classroomIds: string[],
    notFoundMessage: string,
  ) => {
    if (roleName !== RoleNameEnum.TEACHER) return;
    if (!classroomIds.length) throw new NotFoundException(notFoundMessage);

    const [homeroom, assignment] = await Promise.all([
      this.classroomsService.findOne(
        { id: classroomIds, homeroomTeacherId: userId },
        false,
        { attributes: ['id'] },
      ),
      this.classroomSubjectRepository.findOne(
        { classroomId: classroomIds, teacherId: userId },
        false,
        { attributes: ['id'] },
      ),
    ]);
    if (!homeroom && !assignment) throw new NotFoundException(notFoundMessage);
  };

  private findEnrollment = async (classroomId: string, enrollmentId: string) =>
    (await this.findOne({ id: enrollmentId, classroomId }, true, {
      include: ENROLLMENT_INCLUDE,
    }))!;

  // Lista de clase: todas las matrículas del salón, también las retiradas.
  public listClassroomEnrollments = async (
    actor: Viewer,
    classroomId: string,
  ) => {
    const classroom = await this.findOwnClassroom(
      organizationOf(actor),
      classroomId,
      false,
    );
    await this.assertTeaches(
      actor,
      [classroom.id],
      CLASSROOM_NOT_FOUND_MESSAGE,
    );

    return await this.findAll(
      { classroomId: classroom.id },
      {
        include: ENROLLMENT_INCLUDE,
        order: [
          [{ model: StudentModel, as: 'student' }, 'lastName', 'ASC'],
          [{ model: StudentModel, as: 'student' }, 'firstName', 'ASC'],
        ],
      },
    );
  };

  // Historial del estudiante: un registro por año cursado, del más antiguo al
  // más reciente.
  public listStudentHistory = async (actor: Viewer, studentId: string) => {
    const student = (await this.studentsService.findOne(
      { id: studentId, organizationId: organizationOf(actor) },
      true,
      { attributes: STUDENT_ATTRIBUTES },
    ))!;

    const enrollments = await this.findAll(
      { studentId: student.id },
      {
        include: HISTORY_INCLUDE,
        order: [
          [
            { model: AcademicYearModel, as: 'academicYear' },
            'startDate',
            'ASC',
          ],
          ['enrollmentDate', 'ASC'],
          ['createdAt', 'ASC'],
        ],
      },
    );
    await this.assertTeaches(
      actor,
      enrollments.map(({ classroomId }) => classroomId),
      STUDENT_NOT_FOUND_MESSAGE,
    );

    return { student, enrollments };
  };

  // Estudiantes activos que aún no cursan ningún salón en el año del salón.
  public listCandidates = async (
    actor: OrganizationActor,
    classroomId: string,
  ) => {
    const organizationId = organizationOf(actor);
    const classroom = await this.findOwnClassroom(
      organizationId,
      classroomId,
      false,
    );
    const enrolled = await this.enrolledStudentIds(classroom.academicYearId);

    return await this.studentsService.findAll(
      {
        organizationId,
        status: StudentStatusEnum.ACTIVE,
        ...(enrolled.length && { id: { [Op.notIn]: enrolled } }),
      },
      {
        attributes: STUDENT_ATTRIBUTES,
        order: [
          ['lastName', 'ASC'],
          ['firstName', 'ASC'],
        ],
      },
    );
  };

  public enrollStudents = async (
    actor: OrganizationActor,
    classroomId: string,
    { studentIds, enrollmentDate = today() }: EnrollStudentsDto,
  ) => {
    const organizationId = organizationOf(actor);
    const classroom = await this.findOwnClassroom(
      organizationId,
      classroomId,
      true,
    );

    const students = await this.studentsService.findAll(
      {
        id: studentIds,
        organizationId,
        status: StudentStatusEnum.ACTIVE,
      },
      { attributes: ['id', 'firstName', 'lastName'] },
    );
    if (students.length !== studentIds.length)
      throw new BadRequestException(INVALID_STUDENTS_MESSAGE);

    const enrolled = new Set(
      await this.enrolledStudentIds(classroom.academicYearId, studentIds),
    );
    if (enrolled.size)
      throw new ConflictException(
        ALREADY_ENROLLED_MESSAGE(
          students.filter(({ id }) => enrolled.has(id)).map(fullName),
        ),
      );

    await this.assertCapacity(classroom, studentIds.length);

    const created = await this.transaction((transaction: Transaction) =>
      this.insertMany(
        studentIds.map((studentId) => ({
          organizationId,
          studentId,
          academicYearId: classroom.academicYearId,
          classroomId: classroom.id,
          enrollmentDate,
        })),
        { transaction },
      ),
    );

    return { enrolled: created.length };
  };

  // Cambio de salón en el mismo año, retiro/traslado o reactivación.
  public updateEnrollment = async (
    actor: OrganizationActor,
    classroomId: string,
    enrollmentId: string,
    dto: UpdateEnrollmentDto,
  ) => {
    const organizationId = organizationOf(actor);
    const classroom = await this.findOwnClassroom(
      organizationId,
      classroomId,
      true,
    );
    const enrollment = (await this.findOne(
      { id: enrollmentId, classroomId: classroom.id },
      true,
      { attributes: ['id', 'studentId', 'status'] },
    ))!;

    const status = dto.status ?? enrollment.status;
    const moving = !!dto.classroomId && dto.classroomId !== classroom.id;

    if (moving) {
      if (status !== EnrollmentStatusEnum.IN_PROGRESS)
        throw new ConflictException(NOT_IN_PROGRESS_MESSAGE);

      const target = await this.findOwnClassroom(
        organizationId,
        dto.classroomId!,
        true,
      );
      if (target.academicYearId !== classroom.academicYearId)
        throw new BadRequestException(OTHER_YEAR_CLASSROOM_MESSAGE);

      await this.assertCapacity(target, 1);
    }

    // Reactivar exige que no curse ya otro salón del año.
    if (
      status === EnrollmentStatusEnum.IN_PROGRESS &&
      enrollment.status !== EnrollmentStatusEnum.IN_PROGRESS
    ) {
      const [other] = await this.enrolledStudentIds(classroom.academicYearId, [
        enrollment.studentId,
      ]);
      if (other) {
        const student = (await this.studentsService.findByPk(
          enrollment.studentId,
          true,
          { attributes: ['firstName', 'lastName'] },
        ))!;
        throw new ConflictException(
          ALREADY_ENROLLED_MESSAGE([fullName(student)]),
        );
      }
      if (!moving) await this.assertCapacity(classroom, 1);
    }

    await this.updateByPk(enrollment.id, dto);

    return await this.findEnrollment(
      moving ? dto.classroomId! : classroom.id,
      enrollment.id,
    );
  };

  // Para corregir una matrícula hecha por error; un retiro se registra con el
  // estado para conservar el historial.
  public removeEnrollment = async (
    actor: OrganizationActor,
    classroomId: string,
    enrollmentId: string,
  ) => {
    const classroom = await this.findOwnClassroom(
      organizationOf(actor),
      classroomId,
      true,
    );
    const enrollment = (await this.findOne(
      { id: enrollmentId, classroomId: classroom.id },
      true,
      { attributes: ['id'] },
    ))!;

    await this.deleteByPk(enrollment.id);
  };
}
