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
import PermissionEnum from '@common/enums/permission.enum';
import RoleNameEnum from '@common/enums/role-name.enum';
import organizationOf from '@common/utils/organization-of.util';
import { hashPassword, verifyPassword } from '@common/utils/password.util';
import EnrollmentRepository from '../enrollments/enrollment.repository';
import AnnualResultsService from '../gradebooks/annual-results.service';
import EvaluationItemRepository from '../gradebooks/repositories/evaluation-item.repository';
import StudentGradeRepository from '../gradebooks/repositories/student-grade.repository';
import SubjectPeriodConceptRepository from '../gradebooks/repositories/subject-period-concept.repository';
import { resolveConcept } from '../gradebooks/utils/concept.util';
import GradingScalesService from '../grading-scales/grading-scales.service';
import OrganizationRepository from '../organizations/organization.repository';
import PermissionsService from '../permissions/services/permissions.service';
import RankingsService from '../rankings/rankings.service';
import StudentRepository from '../students/student.repository';
import LookupReportCardDto from './dto/lookup-report-card.dto';
import {
  INVALID_ACCESS_PIN_MESSAGE,
  REPORT_CARD_NOT_FOUND_MESSAGE,
  REPORT_CARD_PORTAL_NOT_FOUND_MESSAGE,
  REPORT_CARD_YEAR_NOT_FOUND_MESSAGE,
  STUDENT_PROFILE_NOT_FOUND_MESSAGE,
  TOO_MANY_LOOKUPS_MESSAGE,
} from './constants/report-card-messages.constant';

// Intentos fallidos de documento + PIN antes de bloquear la consulta.
export const LOOKUP_WINDOW_MS = 15 * 60 * 1000;
export const MAX_FAILED_LOOKUPS = 5;

type Actor = Pick<
  AuthContextInterface,
  'organizationId' | 'userId' | 'roleName'
>;

type Enrollment = Awaited<ReturnType<EnrollmentRepository['findAll']>>[number];

// Qué matrícula muestra el boletín y cuáles aparecen en el selector de años.
interface ReportCardScope {
  academicYearId?: string;
  enrollmentId?: string;
  visible?: (enrollment: Pick<Enrollment, 'classroom'>) => boolean;
}

const STUDENT_ATTRIBUTES = [
  'id',
  'firstName',
  'lastName',
  'documentType',
  'documentNumber',
  'studentCode',
];

@Injectable()
export default class ReportCardsService {
  // Hash de referencia para comparar aunque el documento no exista, así la
  // respuesta tarda lo mismo y no revela qué documentos están registrados.
  private dummyPinHash?: Promise<string>;

  constructor(
    private readonly organizationRepository: OrganizationRepository,
    private readonly studentRepository: StudentRepository,
    private readonly enrollmentRepository: EnrollmentRepository,
    private readonly annualResultsService: AnnualResultsService,
    private readonly evaluationItemRepository: EvaluationItemRepository,
    private readonly studentGradeRepository: StudentGradeRepository,
    private readonly subjectPeriodConceptRepository: SubjectPeriodConceptRepository,
    private readonly gradingScalesService: GradingScalesService,
    private readonly permissionsService: PermissionsService,
    private readonly rankingsService: RankingsService,
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

    return await this.buildReportCard(organizationId, student, {
      academicYearId,
    });
  };

  // Boletín de una matrícula para el admin o el director de grupo del salón
  // (al profesor, las demás responden 404). El selector de años lista solo
  // las matrículas que quien consulta puede abrir.
  public getEnrollmentReportCard = async (
    actor: Actor,
    enrollmentId: string,
  ) => {
    const organizationId = organizationOf(actor);
    const enrollment = await this.enrollmentRepository.findOne(
      { id: enrollmentId, organizationId },
      false,
      {
        attributes: ['id'],
        include: [
          { model: StudentModel, attributes: STUDENT_ATTRIBUTES },
          { model: ClassroomModel, attributes: ['id', 'homeroomTeacherId'] },
        ],
      },
    );
    const isTeacher = actor.roleName === RoleNameEnum.TEACHER;
    const visible = ({ classroom }: Pick<Enrollment, 'classroom'>) =>
      !isTeacher || classroom?.homeroomTeacherId === actor.userId;
    if (!enrollment?.student || !visible(enrollment))
      throw new NotFoundException(REPORT_CARD_NOT_FOUND_MESSAGE);

    return await this.buildReportCard(organizationId, enrollment.student, {
      enrollmentId: enrollment.id,
      visible,
    });
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
    return await this.buildReportCard(organization.id, student, {
      academicYearId,
    });
  };

  // Boletín de un año: todas las materias del salón con la definitiva de cada
  // periodo (sus actividades y el concepto del profesor según el rango), el
  // acumulado anual y los promedios generales.
  private buildReportCard = async (
    organizationId: string,
    student: StudentModel,
    { academicYearId, enrollmentId, visible = () => true }: ReportCardScope,
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
              attributes: ['id', 'name', 'homeroomTeacherId'],
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

    // Un año por matrícula visible (la más reciente si cambió de salón).
    const years = [
      ...new Map(
        enrollments
          .filter(visible)
          .reverse()
          .flatMap(({ id, academicYear }) =>
            academicYear
              ? [
                  [
                    academicYear.id,
                    {
                      id: academicYear.id,
                      name: academicYear.name,
                      status: academicYear.status,
                      // El panel del admin navega por matrícula.
                      ...(enrollmentId && { enrollmentId: id }),
                    },
                  ],
                ]
              : [],
          ),
      ).values(),
    ].reverse();
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

    const enrollment = enrollmentId
      ? enrollments.find((item) => item.id === enrollmentId)
      : academicYearId
        ? enrollments.find((item) => item.academicYearId === academicYearId)
        : enrollments[0];
    if (academicYearId && !enrollment)
      throw new NotFoundException(REPORT_CARD_YEAR_NOT_FOUND_MESSAGE);
    if (!enrollment) return { ...base, reportCard: null };

    const scale = await this.gradingScalesService.findScale(organizationId);
    const [{ periods, subjects, resultsFor }, grades] = await Promise.all([
      this.annualResultsService.loadClassroom(
        {
          id: enrollment.classroomId,
          academicYearId: enrollment.academicYearId,
        },
        [enrollment.id],
        scale,
      ),
      this.studentGradeRepository.findAll(
        { enrollmentId: enrollment.id },
        { attributes: ['evaluationItemId', 'score'] },
      ),
    ]);

    const subjectIds = subjects.map(({ id }) => id);
    const [items, concepts] = subjects.length
      ? await Promise.all([
          this.evaluationItemRepository.findAll(
            { classroomSubjectId: subjectIds },
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
          ),
          this.subjectPeriodConceptRepository.findAll(
            { classroomSubjectId: subjectIds },
            {
              attributes: [
                'classroomSubjectId',
                'academicPeriodId',
                'minScore',
                'maxScore',
                'conceptText',
              ],
            },
          ),
        ])
      : [[], []];
    const conceptOf = (
      subjectId: string,
      periodId: string,
      score: number | null,
    ) =>
      resolveConcept(
        concepts.filter(
          (concept) =>
            concept.classroomSubjectId === subjectId &&
            concept.academicPeriodId === periodId,
        ),
        score,
      )?.conceptText ?? null;
    const scoreOf = new Map(
      grades.map(({ evaluationItemId, score }) => [evaluationItemId, score]),
    );
    const activitiesOf = (subjectId: string, periodId: string) =>
      items
        .filter(
          (item) =>
            item.classroomSubjectId === subjectId &&
            item.academicPeriodId === periodId,
        )
        .map(({ id, title, weightPercentage }) => ({
          title,
          weightPercentage,
          score: scoreOf.get(id) ?? null,
        }));

    const results = resultsFor(enrollment.id);
    // Puesto en el salón (anual y por periodo), si el colegio lo publica.
    const rank = scale.showRankInReportCard
      ? (
          await this.rankingsService.classroomPositions(organizationId, {
            id: enrollment.classroomId,
            academicYearId: enrollment.academicYearId,
          })
        )(enrollment.id)
      : null;

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
        subjects: results.subjects.map((subject) => ({
          ...subject,
          periods: Object.fromEntries(
            Object.entries(subject.periods).map(([periodId, result]) => [
              periodId,
              {
                ...result,
                concept: conceptOf(subject.id, periodId, result.score),
                activities: activitiesOf(subject.id, periodId),
              },
            ]),
          ),
        })),
        averages: results.averages,
        rank,
      },
    };
  };
}
