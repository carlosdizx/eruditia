import {
  BadRequestException,
  ConflictException,
  Injectable,
} from '@nestjs/common';
import { Op, OrderItem } from 'sequelize';
import ClassroomModel from '@database/models/classroom.model';
import GradeLevelModel from '@database/models/grade-level.model';
import UserModel from '@database/models/user.model';
import CrudService from '@database/services/crud.service';
import AcademicYearStatusEnum from '@common/enums/academic-year-status.enum';
import organizationOf, {
  type OrganizationActor,
} from '@common/utils/organization-of.util';
import AcademicYearsService from '../academic-years/academic-years.service';
import GradeLevelsService from '../grade-levels/grade-levels.service';
import UsersService from '../users/users.service';
import ClassroomRepository from './classroom.repository';
import ClassroomSubjectRepository from '../classroom-subjects/classroom-subject.repository';
import EnrollmentRepository from '../enrollments/enrollment.repository';
import { CLASSROOM_HAS_ENROLLMENTS_MESSAGE } from '../enrollments/constants/enrollment-messages.constant';
import CreateClassroomDto from './dto/create-classroom.dto';
import UpdateClassroomDto from './dto/update-classroom.dto';
import ListClassroomsDto from './dto/list-classrooms.dto';
import {
  CLASSROOM_NAME_IN_USE_MESSAGE,
  CLOSED_YEAR_CLASSROOMS_MESSAGE,
  INVALID_TEACHER_MESSAGE,
} from './constants/classroom-messages.constant';

export const CLASSROOM_INCLUDE = [
  {
    model: GradeLevelModel,
    attributes: ['id', 'name', 'shortName', 'sequenceOrder'],
  },
  {
    model: UserModel,
    as: 'homeroomTeacher',
    attributes: ['id', 'firstName', 'lastName', 'email'],
  },
];

// Por grado (Transición, 1°, 2°...) y dentro del grado por nombre (A, B...).
const CLASSROOM_ORDER: OrderItem[] = [
  [{ model: GradeLevelModel, as: 'gradeLevel' }, 'sequenceOrder', 'ASC'],
  ['name', 'ASC'],
];

@Injectable()
export default class ClassroomsService extends CrudService<
  ClassroomModel,
  ClassroomRepository
> {
  constructor(
    protected readonly repository: ClassroomRepository,
    private readonly academicYearsService: AcademicYearsService,
    private readonly gradeLevelsService: GradeLevelsService,
    private readonly usersService: UsersService,
    private readonly classroomSubjectRepository: ClassroomSubjectRepository,
    private readonly enrollmentRepository: EnrollmentRepository,
  ) {
    super(repository);
  }

  // Un año cerrado es historial: sus salones ya no cambian.
  private assertEditableYear = async (
    organizationId: string,
    academicYearId: string,
  ) => {
    const year = (await this.academicYearsService.findOne(
      { id: academicYearId, organizationId },
      true,
      { attributes: ['id', 'status'] },
    ))!;
    if (year.status === AcademicYearStatusEnum.CLOSED)
      throw new ConflictException(CLOSED_YEAR_CLASSROOMS_MESSAGE);
  };

  private assertGradeLevel = async (
    organizationId: string,
    gradeLevelId: string,
  ) => {
    await this.gradeLevelsService.findOne(
      { id: gradeLevelId, organizationId },
      true,
      { attributes: ['id'] },
    );
  };

  private assertTeacher = async (organizationId: string, teacherId: string) => {
    const [teacher] = await this.usersService.findOrganizationTeachers(
      organizationId,
      [teacherId],
    );
    if (!teacher) throw new BadRequestException(INVALID_TEACHER_MESSAGE);
  };

  private assertNameAvailable = async (
    academicYearId: string,
    name: string,
    exceptClassroomId?: string,
  ) => {
    const existing = await this.findOne(
      {
        academicYearId,
        name,
        ...(exceptClassroomId && { id: { [Op.ne]: exceptClassroomId } }),
      },
      false,
      { attributes: ['id'] },
    );
    if (existing) throw new ConflictException(CLASSROOM_NAME_IN_USE_MESSAGE);
  };

  // Un salón de otra organización responde 404, igual que uno inexistente.
  private findOwnClassroom = async (
    organizationId: string,
    classroomId: string,
  ) =>
    (await this.findOne({ id: classroomId, organizationId }, true, {
      attributes: ['id', 'academicYearId', 'homeroomTeacherId'],
    }))!;

  public listClassrooms = async (
    actor: OrganizationActor,
    { academicYearId, gradeLevelId }: ListClassroomsDto,
  ) =>
    await this.findAll(
      {
        organizationId: organizationOf(actor),
        academicYearId,
        ...(gradeLevelId && { gradeLevelId }),
      },
      { include: CLASSROOM_INCLUDE, order: CLASSROOM_ORDER },
    );

  public findClassroom = async (
    actor: OrganizationActor,
    classroomId: string,
  ) =>
    (await this.findOne(
      { id: classroomId, organizationId: organizationOf(actor) },
      true,
      { include: CLASSROOM_INCLUDE },
    ))!;

  // Profesores que se pueden asignar como director de grupo.
  public listTeachers = async (actor: OrganizationActor) =>
    await this.usersService.findOrganizationTeachers(organizationOf(actor));

  public createClassroom = async (
    actor: OrganizationActor,
    dto: CreateClassroomDto,
  ) => {
    const organizationId = organizationOf(actor);

    await this.assertEditableYear(organizationId, dto.academicYearId);
    await this.assertGradeLevel(organizationId, dto.gradeLevelId);
    if (dto.homeroomTeacherId)
      await this.assertTeacher(organizationId, dto.homeroomTeacherId);
    await this.assertNameAvailable(dto.academicYearId, dto.name);

    const classroom = await this.create({ ...dto, organizationId });

    return await this.findClassroom(actor, classroom.id);
  };

  public updateClassroom = async (
    actor: OrganizationActor,
    classroomId: string,
    dto: UpdateClassroomDto,
  ) => {
    const organizationId = organizationOf(actor);
    const classroom = await this.findOwnClassroom(organizationId, classroomId);

    await this.assertEditableYear(organizationId, classroom.academicYearId);
    if (dto.gradeLevelId)
      await this.assertGradeLevel(organizationId, dto.gradeLevelId);
    // Si el director no cambia no se revalida (pudo quedar inactivo).
    if (
      dto.homeroomTeacherId &&
      dto.homeroomTeacherId !== classroom.homeroomTeacherId
    )
      await this.assertTeacher(organizationId, dto.homeroomTeacherId);
    if (dto.name)
      await this.assertNameAvailable(
        classroom.academicYearId,
        dto.name,
        classroom.id,
      );

    await this.updateByPk(classroom.id, dto);

    return await this.findClassroom(actor, classroom.id);
  };

  public deleteClassroom = async (
    actor: OrganizationActor,
    classroomId: string,
  ) => {
    const organizationId = organizationOf(actor);
    const classroom = await this.findOwnClassroom(organizationId, classroomId);

    await this.assertEditableYear(organizationId, classroom.academicYearId);

    // Las matrículas son historial: primero hay que anularlas o moverlas.
    const enrollment = await this.enrollmentRepository.findOne(
      { classroomId: classroom.id },
      false,
      { attributes: ['id'] },
    );
    if (enrollment)
      throw new ConflictException(CLASSROOM_HAS_ENROLLMENTS_MESSAGE);

    // Su carga académica (materias asignadas) se elimina con él.
    await this.transaction(async (transaction) => {
      await this.classroomSubjectRepository.deleteByClassroom(
        classroom.id,
        transaction,
      );
      await this.deleteByPk(classroom.id, { transaction });
    });
  };
}
