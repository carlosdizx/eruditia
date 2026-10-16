import {
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';
import type AuthContextInterface from '@auth/interfaces/auth-context.interface';
import AcademicYearModel from '@database/models/academic-year.model';
import ClassroomModel from '@database/models/classroom.model';
import GradeLevelModel from '@database/models/grade-level.model';
import StudentModel from '@database/models/student.model';
import SubjectModel from '@database/models/subject.model';
import UserModel from '@database/models/user.model';
import PermissionEnum from '@common/enums/permission.enum';
import organizationOf from '@common/utils/organization-of.util';
import { hashPassword, verifyPassword } from '@common/utils/password.util';
import { roundScore } from '@common/utils/score.util';
import AcademicPeriodRepository from '../academic-years/repositories/academic-period.repository';
import ClassroomSubjectRepository from '../classroom-subjects/classroom-subject.repository';
import EnrollmentRepository from '../enrollments/enrollment.repository';
import EvaluationItemRepository from '../gradebooks/repositories/evaluation-item.repository';
import PeriodSubjectSummaryRepository from '../gradebooks/repositories/period-subject-summary.repository';
import StudentGradeRepository from '../gradebooks/repositories/student-grade.repository';
import annualScore from '../gradebooks/utils/annual-score.util';
import GradingScalesService from '../grading-scales/grading-scales.service';
import OrganizationRepository from '../organizations/organization.repository';
import PermissionsService from '../permissions/services/permissions.service';
import StudentRepository from '../students/student.repository';
import LookupReportCardDto from './dto/lookup-report-card.dto';
import {
  INVALID_ACCESS_PIN_MESSAGE,
  REPORT_CARD_PORTAL_NOT_FOUND_MESSAGE,
  REPORT_CARD_YEAR_NOT_FOUND_MESSAGE,
  STUDENT_PROFILE_NOT_FOUND_MESSAGE,
  TOO_MANY_LOOKUPS_MESSAGE,
} from './constants/report-card-messages.constant';

// Intentos fallidos de documento + PIN antes de bloquear la consulta.
export const LOOKUP_WINDOW_MS = 15 * 60 * 1000;
export const MAX_FAILED_LOOKUPS = 5;

const STUDENT_ATTRIBUTES = [
  'id',
  'firstName',
  'lastName',
  'documentType',
  'documentNumber',
  'studentCode',
];

type Weighted = { score: number | null; weight: number };

// Promedio ponderado de las notas presentes; null si no hay ninguna.
const weightedAverage = (values: Weighted[], decimalPlaces: number) => {
  const graded = values.filter(
    (value): value is { score: number; weight: number } => value.score !== null,
  );
  const totalWeight = graded.reduce((sum, { weight }) => sum + weight, 0);
  if (!totalWeight) return null;
  return roundScore(
    graded.reduce((sum, { score, weight }) => sum + score * weight, 0) /
      totalWeight,
    decimalPlaces,
  );
};

@Injectable()
export default class ReportCardsService {
  // Hash de referencia para comparar aunque el documento no exista, así la
  // respuesta tarda lo mismo y no revela qué documentos están registrados.
  private dummyPinHash?: Promise<string>;

  constructor(
    private readonly organizationRepository: OrganizationRepository,
    private readonly studentRepository: StudentRepository,
    private readonly enrollmentRepository: EnrollmentRepository,
    private readonly academicPeriodRepository: AcademicPeriodRepository,
    private readonly classroomSubjectRepository: ClassroomSubjectRepository,
    private readonly periodSubjectSummaryRepository: PeriodSubjectSummaryRepository,
    private readonly evaluationItemRepository: EvaluationItemRepository,
    private readonly studentGradeRepository: StudentGradeRepository,
    private readonly gradingScalesService: GradingScalesService,
    private readonly permissionsService: PermissionsService,
    @Inject(CACHE_MANAGER) private readonly cache: Cache,
  ) {}

  // Boletín del estudiante que inició sesión.
  public getOwnReportCard = async (
    actor: Pick<AuthContextInterface, 'organizationId' | 'userId'>,
    academicYearId?: string,
  ) => {
    const organizationId = organizationOf(actor);
    const student = await this.studentRepository.findOne(
      { userId: actor.userId, organizationId },
      false,
      { attributes: STUDENT_ATTRIBUTES },
    );
    if (!student)
      throw new NotFoundException(STUDENT_PROFILE_NOT_FOUND_MESSAGE);

    return await this.buildReportCard(organizationId, student, academicYearId);
  };

  // Portal público: solo colegios activos que tengan contratado el boletín.
  public getPortal = async (slug: string) => {
    const organization = await this.organizationRepository.findOne(
      { slug: slug.toLowerCase(), isActive: true },
      false,
      { attributes: ['id', 'name', 'slug', 'logoUrl'] },
    );
    const permissions = organization
      ? await this.permissionsService.getEffectivePermissions(organization.id)
      : [];
    if (!organization || !permissions.includes(PermissionEnum.REPORT_CARD_VIEW))
      throw new NotFoundException(REPORT_CARD_PORTAL_NOT_FOUND_MESSAGE);

    return organization;
  };

  public getPublicPortal = async (slug: string) => {
    const {
      name,
      slug: organizationSlug,
      logoUrl,
    } = await this.getPortal(slug);
    return { name, slug: organizationSlug, logoUrl };
  };

  // Consulta sin cuenta con documento + PIN. Los intentos fallidos se limitan
  // por documento para frenar la fuerza bruta sobre el PIN.
  public lookupReportCard = async (
    slug: string,
    { documentNumber, accessPin, academicYearId }: LookupReportCardDto,
  ) => {
    const organization = await this.getPortal(slug);
    const key = `report-card-lookup:${organization.id}:${documentNumber.toLowerCase()}`;
    const failures = (await this.cache.get<number>(key)) ?? 0;
    if (failures >= MAX_FAILED_LOOKUPS)
      throw new HttpException(
        TOO_MANY_LOOKUPS_MESSAGE,
        HttpStatus.TOO_MANY_REQUESTS,
      );

    const student = await this.studentRepository.findOne(
      { organizationId: organization.id, documentNumber },
      false,
      { attributes: [...STUDENT_ATTRIBUTES, 'accessPin'] },
    );
    this.dummyPinHash ??= hashPassword('000000');
    const valid = await verifyPassword(
      accessPin,
      student?.accessPin ?? (await this.dummyPinHash),
    );

    if (!student?.accessPin || !valid) {
      await this.cache.set(key, failures + 1, LOOKUP_WINDOW_MS);
      throw new UnauthorizedException(INVALID_ACCESS_PIN_MESSAGE);
    }

    await this.cache.del(key);
    return await this.buildReportCard(organization.id, student, academicYearId);
  };

  // Boletín de un año: todas las materias del salón con la definitiva de cada
  // periodo (y sus actividades), el acumulado anual y los promedios generales.
  private buildReportCard = async (
    organizationId: string,
    student: StudentModel,
    academicYearId?: string,
  ) => {
    const [organization, enrollments] = await Promise.all([
      this.organizationRepository.findByPk(organizationId, true, {
        attributes: ['name', 'logoUrl'],
      }),
      this.enrollmentRepository.findAll(
        { organizationId, studentId: student.id },
        {
          attributes: ['id', 'status', 'academicYearId', 'classroomId'],
          include: [
            {
              model: AcademicYearModel,
              attributes: ['id', 'name', 'status', 'startDate'],
            },
            {
              model: ClassroomModel,
              attributes: ['id', 'name'],
              include: [{ model: GradeLevelModel, attributes: ['id', 'name'] }],
            },
          ],
          order: [
            [
              { model: AcademicYearModel, as: 'academicYear' },
              'startDate',
              'DESC',
            ],
            ['createdAt', 'DESC'],
          ],
        },
      ),
    ]);

    const years = [
      ...new Map(
        enrollments.flatMap(({ academicYear }) =>
          academicYear
            ? [
                [
                  academicYear.id,
                  {
                    id: academicYear.id,
                    name: academicYear.name,
                    status: academicYear.status,
                  },
                ],
              ]
            : [],
        ),
      ).values(),
    ];
    const base = {
      organization: {
        name: organization!.name,
        logoUrl: organization!.logoUrl,
      },
      student: {
        firstName: student.firstName,
        lastName: student.lastName,
        documentType: student.documentType,
        documentNumber: student.documentNumber,
        studentCode: student.studentCode,
      },
      years,
    };

    const enrollment = academicYearId
      ? enrollments.find((item) => item.academicYearId === academicYearId)
      : enrollments[0];
    if (academicYearId && !enrollment)
      throw new NotFoundException(REPORT_CARD_YEAR_NOT_FOUND_MESSAGE);
    if (!enrollment) return { ...base, reportCard: null };

    const [scale, periods, assignments, summaries, grades] = await Promise.all([
      this.gradingScalesService.findScale(organizationId),
      this.academicPeriodRepository.findAll(
        { academicYearId: enrollment.academicYearId },
        {
          attributes: ['id', 'name', 'orderIndex', 'weightPercentage'],
          order: [['orderIndex', 'ASC']],
        },
      ),
      this.classroomSubjectRepository.findAll(
        { classroomId: enrollment.classroomId },
        {
          attributes: ['id', 'weightInGpa'],
          include: [
            { model: SubjectModel, attributes: ['id', 'name', 'areaName'] },
            {
              model: UserModel,
              as: 'teacher',
              attributes: ['id', 'firstName', 'lastName'],
            },
          ],
          order: [[{ model: SubjectModel, as: 'subject' }, 'name', 'ASC']],
        },
      ),
      this.periodSubjectSummaryRepository.findAll(
        { enrollmentId: enrollment.id },
        {
          attributes: [
            'classroomSubjectId',
            'academicPeriodId',
            'finalPeriodScore',
            'teacherObservation',
          ],
        },
      ),
      this.studentGradeRepository.findAll(
        { enrollmentId: enrollment.id },
        { attributes: ['evaluationItemId', 'score'] },
      ),
    ]);

    const items = assignments.length
      ? await this.evaluationItemRepository.findAll(
          { classroomSubjectId: assignments.map(({ id }) => id) },
          {
            attributes: [
              'id',
              'classroomSubjectId',
              'academicPeriodId',
              'title',
              'weightPercentage',
            ],
            order: [['sortOrder', 'ASC']],
          },
        )
      : [];

    const summaryOf = new Map(
      summaries.map((summary) => [
        `${summary.classroomSubjectId}:${summary.academicPeriodId}`,
        summary,
      ]),
    );
    const scoreOf = new Map(
      grades.map(({ evaluationItemId, score }) => [evaluationItemId, score]),
    );

    const subjects = assignments.map(
      ({ id, weightInGpa, subject, teacher }) => {
        const periodResults = periods.map((period) => {
          const summary = summaryOf.get(`${id}:${period.id}`);
          return {
            periodId: period.id,
            weightPercentage: period.weightPercentage,
            score: summary?.finalPeriodScore ?? null,
            observation: summary?.teacherObservation ?? null,
            activities: items
              .filter(
                (item) =>
                  item.classroomSubjectId === id &&
                  item.academicPeriodId === period.id,
              )
              .map(({ id: itemId, title, weightPercentage }) => ({
                title,
                weightPercentage,
                score: scoreOf.get(itemId) ?? null,
              })),
          };
        });
        return {
          id,
          weightInGpa,
          subject,
          teacher: teacher
            ? { firstName: teacher.firstName, lastName: teacher.lastName }
            : null,
          periods: Object.fromEntries(
            periodResults.map(
              ({ periodId, score, observation, activities }) => [
                periodId,
                { score, observation, activities },
              ],
            ),
          ),
          annual: annualScore(periodResults, scale),
        };
      },
    );

    return {
      ...base,
      reportCard: {
        academicYear: {
          id: enrollment.academicYear!.id,
          name: enrollment.academicYear!.name,
          status: enrollment.academicYear!.status,
        },
        classroom: {
          name: enrollment.classroom!.name,
          gradeLevel: enrollment.classroom!.gradeLevel ?? null,
        },
        enrollmentStatus: enrollment.status,
        scale,
        periods,
        subjects,
        // Promedios del estudiante ponderados por el peso de cada materia.
        averages: {
          periods: Object.fromEntries(
            periods.map(({ id }) => [
              id,
              weightedAverage(
                subjects.map(({ periods: results, weightInGpa }) => ({
                  score: results[id].score,
                  weight: weightInGpa,
                })),
                scale.decimalPlaces,
              ),
            ]),
          ),
          general: weightedAverage(
            subjects.map(({ annual, weightInGpa }) => ({
              score: annual.projected,
              weight: weightInGpa,
            })),
            scale.decimalPlaces,
          ),
        },
      },
    };
  };
}
