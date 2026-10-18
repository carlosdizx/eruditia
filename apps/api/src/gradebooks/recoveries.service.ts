import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type AuthContextInterface from '@auth/interfaces/auth-context.interface';
import AcademicPeriodModel from '@database/models/academic-period.model';
import AcademicYearModel from '@database/models/academic-year.model';
import ClassroomModel from '@database/models/classroom.model';
import GradeLevelModel from '@database/models/grade-level.model';
import StudentModel from '@database/models/student.model';
import SubjectModel from '@database/models/subject.model';
import UserModel from '@database/models/user.model';
import AcademicYearStatusEnum from '@common/enums/academic-year-status.enum';
import EnrollmentStatusEnum from '@common/enums/enrollment-status.enum';
import RoleNameEnum from '@common/enums/role-name.enum';
import organizationOf from '@common/utils/organization-of.util';
import { hasAtMostDecimals } from '@common/utils/score.util';
import AcademicPeriodRepository from '../academic-years/repositories/academic-period.repository';
import AcademicYearRepository from '../academic-years/repositories/academic-year.repository';
import ClassroomSubjectRepository from '../classroom-subjects/classroom-subject.repository';
import EnrollmentRepository from '../enrollments/enrollment.repository';
import GradingScalesService, {
  type GradingScale,
} from '../grading-scales/grading-scales.service';
import PeriodSubjectSummaryRepository from './repositories/period-subject-summary.repository';
import SubjectRecoveryRepository from './repositories/subject-recovery.repository';
import annualScore, {
  canRecover,
  withRecovery,
} from './utils/annual-score.util';
import SaveRecoveryDto from './dto/save-recovery.dto';
import {
  GRADEBOOK_NOT_FOUND_MESSAGE,
  GRADEBOOK_YEAR_CLOSED_MESSAGE,
  RECOVERY_ENROLLMENT_MESSAGE,
  RECOVERY_NOT_ALLOWED_MESSAGE,
  RECOVERY_SCORE_DECIMALS_MESSAGE,
  RECOVERY_SCORE_RANGE_MESSAGE,
} from './constants/gradebook-messages.constant';

type Actor = Pick<
  AuthContextInterface,
  'organizationId' | 'userId' | 'roleName'
>;

const STUDENT_ATTRIBUTES = [
  'id',
  'studentCode',
  'documentType',
  'documentNumber',
  'firstName',
  'lastName',
];
const PERIOD_ATTRIBUTES = ['id', 'name', 'orderIndex', 'weightPercentage'];

type PeriodRow = Pick<AcademicPeriodModel, 'id' | 'weightPercentage'>;
type ScoreKey = `${string}:${string}:${string}`;

// Acumulado anual sin recuperación de una matrícula en una materia.
const originalAnnual = (
  periods: PeriodRow[],
  scoreOf: Map<ScoreKey, number | null>,
  classroomSubjectId: string,
  enrollmentId: string,
  scale: GradingScale,
) =>
  annualScore(
    periods.map(({ id, weightPercentage }) => ({
      weightPercentage,
      score: scoreOf.get(`${classroomSubjectId}:${enrollmentId}:${id}`) ?? null,
    })),
    scale,
  );

// Recuperaciones de fin de año: el profesor registra la nota con la que el
// estudiante recupera una materia perdida y esa nota reemplaza el acumulado.
@Injectable()
export default class RecoveriesService {
  constructor(
    private readonly academicYearRepository: AcademicYearRepository,
    private readonly academicPeriodRepository: AcademicPeriodRepository,
    private readonly classroomSubjectRepository: ClassroomSubjectRepository,
    private readonly enrollmentRepository: EnrollmentRepository,
    private readonly periodSubjectSummaryRepository: PeriodSubjectSummaryRepository,
    private readonly subjectRecoveryRepository: SubjectRecoveryRepository,
    private readonly gradingScalesService: GradingScalesService,
  ) {}

  private listPeriods = async (academicYearId: string) =>
    await this.academicPeriodRepository.findAll(
      { academicYearId },
      { attributes: PERIOD_ATTRIBUTES, order: [['orderIndex', 'ASC']] },
    );

  private loadScores = async (
    classroomSubjectIds: string[],
    enrollmentIds?: string[],
  ) =>
    new Map<ScoreKey, number | null>(
      (classroomSubjectIds.length
        ? await this.periodSubjectSummaryRepository.findAll(
            {
              classroomSubjectId: classroomSubjectIds,
              ...(enrollmentIds && { enrollmentId: enrollmentIds }),
            },
            {
              attributes: [
                'classroomSubjectId',
                'enrollmentId',
                'academicPeriodId',
                'finalPeriodScore',
              ],
            },
          )
        : []
      ).map(
        ({
          classroomSubjectId,
          enrollmentId,
          academicPeriodId,
          finalPeriodScore,
        }) => [
          `${classroomSubjectId}:${enrollmentId}:${academicPeriodId}`,
          finalPeriodScore,
        ],
      ),
    );

  // Materias del año con estudiantes que la perdieron o ya la recuperaron. El
  // profesor ve solo las que dicta; el admin, todas.
  public listRecoveries = async (actor: Actor, academicYearId?: string) => {
    const organizationId = organizationOf(actor);
    const academicYear = await this.academicYearRepository.findOne(
      academicYearId
        ? { id: academicYearId, organizationId }
        : { organizationId, isActive: true },
      !!academicYearId,
      { attributes: ['id', 'name', 'status'] },
    );
    const scale = await this.gradingScalesService.findScale(organizationId);
    if (!academicYear)
      return { academicYear: null, scale, periods: [], subjects: [] };

    const isTeacher = actor.roleName === RoleNameEnum.TEACHER;
    const [periods, assignments] = await Promise.all([
      this.listPeriods(academicYear.id),
      this.classroomSubjectRepository.findAll(
        {
          organizationId,
          ...(isTeacher && { teacherId: actor.userId }),
        },
        {
          attributes: ['id', 'classroomId'],
          include: [
            { model: SubjectModel, attributes: ['id', 'name', 'code'] },
            {
              model: UserModel,
              as: 'teacher',
              attributes: ['id', 'firstName', 'lastName'],
            },
            {
              model: ClassroomModel,
              attributes: ['id', 'name'],
              where: { academicYearId: academicYear.id },
              include: [{ model: GradeLevelModel, attributes: ['id', 'name'] }],
            },
          ],
          order: [
            [{ model: ClassroomModel, as: 'classroom' }, 'name', 'ASC'],
            [{ model: SubjectModel, as: 'subject' }, 'name', 'ASC'],
          ],
        },
      ),
    ]);

    const classroomIds = [
      ...new Set(assignments.map(({ classroomId }) => classroomId)),
    ];
    const assignmentIds = assignments.map(({ id }) => id);
    const [enrollments, scoreOf, recoveries] = await Promise.all([
      classroomIds.length
        ? this.enrollmentRepository.findAll(
            { classroomId: classroomIds },
            {
              attributes: ['id', 'classroomId', 'status'],
              include: [
                { model: StudentModel, attributes: STUDENT_ATTRIBUTES },
              ],
              order: [
                [{ model: StudentModel, as: 'student' }, 'lastName', 'ASC'],
                [{ model: StudentModel, as: 'student' }, 'firstName', 'ASC'],
              ],
            },
          )
        : [],
      this.loadScores(assignmentIds),
      assignmentIds.length
        ? this.subjectRecoveryRepository.findAll(
            { classroomSubjectId: assignmentIds },
            {
              attributes: [
                'classroomSubjectId',
                'enrollmentId',
                'score',
                'notes',
                'updatedAt',
              ],
            },
          )
        : [],
    ]);
    const recoveryOf = new Map(
      recoveries.map((recovery) => [
        `${recovery.classroomSubjectId}:${recovery.enrollmentId}`,
        recovery,
      ]),
    );

    const subjects = assignments.flatMap(
      ({ id, classroomId, subject, teacher, classroom }) => {
        const students = enrollments
          .filter((enrollment) => enrollment.classroomId === classroomId)
          .flatMap(({ id: enrollmentId, status, student }) => {
            const original = originalAnnual(
              periods,
              scoreOf,
              id,
              enrollmentId,
              scale,
            );
            const stored = recoveryOf.get(`${id}:${enrollmentId}`);
            if (!stored && !canRecover(original, scale.passingScore)) return [];
            return [
              {
                enrollmentId,
                status,
                student,
                editable:
                  status === EnrollmentStatusEnum.IN_PROGRESS &&
                  academicYear.status !== AcademicYearStatusEnum.CLOSED,
                periodScores: Object.fromEntries(
                  periods.map(({ id: periodId }) => [
                    periodId,
                    scoreOf.get(`${id}:${enrollmentId}:${periodId}`) ?? null,
                  ]),
                ),
                originalScore: original.projected,
                recovery: stored
                  ? {
                      score: stored.score,
                      notes: stored.notes,
                      updatedAt: stored.updatedAt,
                    }
                  : null,
              },
            ];
          });
        return students.length
          ? [
              {
                id,
                subject,
                teacher: teacher ?? null,
                classroom,
                students,
              },
            ]
          : [];
      },
    );

    return { academicYear, scale, periods, subjects };
  };

  // Materia que el actor puede recuperar: el profesor, solo las que dicta.
  private loadAssignment = async (actor: Actor, classroomSubjectId: string) => {
    const organizationId = organizationOf(actor);
    const assignment = await this.classroomSubjectRepository.findOne(
      { id: classroomSubjectId, organizationId },
      false,
      {
        attributes: ['id', 'classroomId', 'teacherId'],
        include: [
          {
            model: ClassroomModel,
            attributes: ['id', 'academicYearId'],
            include: [
              { model: AcademicYearModel, attributes: ['id', 'status'] },
            ],
          },
        ],
      },
    );
    if (
      !assignment?.classroom ||
      (actor.roleName === RoleNameEnum.TEACHER &&
        assignment.teacherId !== actor.userId)
    )
      throw new NotFoundException(GRADEBOOK_NOT_FOUND_MESSAGE);
    if (
      assignment.classroom.academicYear?.status ===
      AcademicYearStatusEnum.CLOSED
    )
      throw new ConflictException(GRADEBOOK_YEAR_CLOSED_MESSAGE);

    return { organizationId, assignment };
  };

  private findEnrollment = async (
    classroomId: string,
    enrollmentId: string,
  ) => {
    const enrollment = await this.enrollmentRepository.findOne(
      {
        id: enrollmentId,
        classroomId,
        status: EnrollmentStatusEnum.IN_PROGRESS,
      },
      false,
      { attributes: ['id'] },
    );
    if (!enrollment) throw new BadRequestException(RECOVERY_ENROLLMENT_MESSAGE);
    return enrollment;
  };

  // Registra o corrige la nota de recuperación. Solo para materias perdidas
  // con todos los periodos calificados.
  public saveRecovery = async (
    actor: Actor,
    classroomSubjectId: string,
    enrollmentId: string,
    { score, notes }: SaveRecoveryDto,
  ) => {
    const { organizationId, assignment } = await this.loadAssignment(
      actor,
      classroomSubjectId,
    );
    await this.findEnrollment(assignment.classroomId, enrollmentId);

    const [scale, periods, scoreOf] = await Promise.all([
      this.gradingScalesService.findScale(organizationId),
      this.listPeriods(assignment.classroom!.academicYearId),
      this.loadScores([assignment.id], [enrollmentId]),
    ]);
    const original = originalAnnual(
      periods,
      scoreOf,
      assignment.id,
      enrollmentId,
      scale,
    );
    if (!canRecover(original, scale.passingScore))
      throw new BadRequestException(RECOVERY_NOT_ALLOWED_MESSAGE);

    const format = (value: number) => value.toFixed(scale.decimalPlaces);
    if (score < scale.minScore || score > scale.maxScore)
      throw new BadRequestException(
        RECOVERY_SCORE_RANGE_MESSAGE(
          format(scale.minScore),
          format(scale.maxScore),
        ),
      );
    if (!hasAtMostDecimals(score, scale.decimalPlaces))
      throw new BadRequestException(
        RECOVERY_SCORE_DECIMALS_MESSAGE(scale.decimalPlaces),
      );

    const values = {
      score,
      notes: notes?.trim() || null,
      recordedBy: actor.userId,
    };
    const existing = await this.subjectRecoveryRepository.findOne(
      { classroomSubjectId: assignment.id, enrollmentId },
      false,
      { attributes: ['id'] },
    );
    if (existing)
      await this.subjectRecoveryRepository.updateByPk(existing.id, values);
    else
      await this.subjectRecoveryRepository.create({
        ...values,
        organizationId,
        classroomSubjectId: assignment.id,
        enrollmentId,
      });

    return withRecovery(original, values, scale.passingScore);
  };

  // Quita la recuperación: la materia vuelve a su acumulado original.
  public deleteRecovery = async (
    actor: Actor,
    classroomSubjectId: string,
    enrollmentId: string,
  ) => {
    const { assignment } = await this.loadAssignment(actor, classroomSubjectId);
    await this.findEnrollment(assignment.classroomId, enrollmentId);

    const existing = await this.subjectRecoveryRepository.findOne(
      { classroomSubjectId: assignment.id, enrollmentId },
      true,
      { attributes: ['id'] },
    );
    await this.subjectRecoveryRepository.deleteByPk(existing!.id);
  };
}
