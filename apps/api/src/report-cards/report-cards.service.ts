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
import { Op } from 'sequelize';
import type AuthContextInterface from '@auth/interfaces/auth-context.interface';
import AcademicYearModel from '@database/models/academic-year.model';
import ClassroomModel from '@database/models/classroom.model';
import GradeLevelModel from '@database/models/grade-level.model';
import StudentModel from '@database/models/student.model';
import UserModel from '@database/models/user.model';
import EnrollmentStatusEnum from '@common/enums/enrollment-status.enum';
import PermissionEnum from '@common/enums/permission.enum';
import RoleNameEnum from '@common/enums/role-name.enum';
import organizationOf from '@common/utils/organization-of.util';
import { hashPassword, verifyPassword } from '@common/utils/password.util';
import AcademicPeriodRepository from '../academic-years/repositories/academic-period.repository';
import ClassroomRepository from '../classrooms/classroom.repository';
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
import GetReportCardPdfDto from './dto/get-report-card-pdf.dto';
import LookupReportCardPdfDto from './dto/lookup-report-card-pdf.dto';
import renderReportCardsPdf, {
  type PrintableReportCard,
} from './utils/report-card-pdf.util';
import {
  INVALID_ACCESS_PIN_MESSAGE,
  REPORT_CARD_CLASSROOM_EMPTY_MESSAGE,
  REPORT_CARD_CLASSROOM_NOT_FOUND_MESSAGE,
  REPORT_CARD_NOT_FOUND_MESSAGE,
  REPORT_CARD_PERIOD_NOT_FOUND_MESSAGE,
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

const CLASSROOM_INCLUDE = {
  model: ClassroomModel,
  attributes: ['id', 'name', 'homeroomTeacherId'],
  include: [
    { model: GradeLevelModel, attributes: ['id', 'name'] },
    {
      model: UserModel,
      as: 'homeroomTeacher',
      attributes: ['id', 'firstName', 'lastName'],
    },
  ],
};

// Ya no cursan en el salón: su boletín no va en el PDF del salón.
const NOT_PRINTED_STATUSES = [
  EnrollmentStatusEnum.WITHDRAWN,
  EnrollmentStatusEnum.TRANSFERRED,
];

export interface ReportCardPdf {
  filename: string;
  content: Buffer;
}

const publicStudent = (student: StudentModel) => ({
  firstName: student.firstName,
  lastName: student.lastName,
  documentType: student.documentType,
  documentNumber: student.documentNumber,
  studentCode: student.studentCode,
});

const describeEnrollment = ({
  status,
  academicYear,
  classroom,
}: Pick<Enrollment, 'status' | 'academicYear' | 'classroom'>) => ({
  academicYear: {
    id: academicYear!.id,
    name: academicYear!.name,
    status: academicYear!.status,
  },
  classroom: {
    name: classroom!.name,
    gradeLevel: classroom!.gradeLevel ?? null,
    homeroomTeacher: classroom!.homeroomTeacher
      ? {
          firstName: classroom!.homeroomTeacher.firstName,
          lastName: classroom!.homeroomTeacher.lastName,
        }
      : null,
  },
  enrollmentStatus: status,
});

// Nombre de archivo sin tildes ni espacios: "boletin-perez-ana-2026.pdf".
const slugify = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

@Injectable()
export default class ReportCardsService {
  // Hash de referencia para comparar aunque el documento no exista, así la
  // respuesta tarda lo mismo y no revela qué documentos están registrados.
  private dummyPinHash?: Promise<string>;

  constructor(
    private readonly organizationRepository: OrganizationRepository,
    private readonly studentRepository: StudentRepository,
    private readonly enrollmentRepository: EnrollmentRepository,
    private readonly classroomRepository: ClassroomRepository,
    private readonly academicPeriodRepository: AcademicPeriodRepository,
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

  // Datos de un salón que comparten los boletines de sus matrículas (un PDF
  // por salón los arma todos con las mismas consultas).
  private loadClassroomCards = async (
    organizationId: string,
    classroom: { id: string; academicYearId: string },
    enrollmentIds: string[],
  ) => {
    const scale = await this.gradingScalesService.findScale(organizationId);
    const [{ periods, subjects, resultsFor }, grades, positionsOf] =
      await Promise.all([
        this.annualResultsService.loadClassroom(
          classroom,
          enrollmentIds,
          scale,
        ),
        enrollmentIds.length
          ? this.studentGradeRepository.findAll(
              { enrollmentId: enrollmentIds },
              { attributes: ['enrollmentId', 'evaluationItemId', 'score'] },
            )
          : [],
        // Puesto en el salón (anual y por periodo), si el colegio lo publica.
        scale.showRankInReportCard
          ? this.rankingsService.classroomPositions(organizationId, classroom)
          : null,
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
      periodId: string | undefined,
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
      grades.map(({ enrollmentId, evaluationItemId, score }) => [
        `${enrollmentId}:${evaluationItemId}`,
        score,
      ]),
    );
    const activitiesOf = (
      enrollmentId: string,
      subjectId: string,
      periodId: string,
    ) =>
      items
        .filter(
          (item) =>
            item.classroomSubjectId === subjectId &&
            item.academicPeriodId === periodId,
        )
        .map(({ id, title, weightPercentage }) => ({
          title,
          weightPercentage,
          score: scoreOf.get(`${enrollmentId}:${id}`) ?? null,
        }));
    const lastPeriod = periods.at(-1);

    return (enrollmentId: string) => {
      const results = resultsFor(enrollmentId);
      return {
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
                activities: activitiesOf(enrollmentId, subject.id, periodId),
              },
            ]),
          ),
          // Año completo (o recuperado): la definitiva evaluada con los rangos
          // del último periodo.
          finalConcept: subject.annual.complete
            ? conceptOf(subject.id, lastPeriod?.id, subject.annual.projected)
            : null,
        })),
        averages: results.averages,
        rank: positionsOf ? positionsOf(enrollmentId) : null,
      };
    };
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
            CLASSROOM_INCLUDE,
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
      student: publicStudent(student),
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

    const cardFor = await this.loadClassroomCards(
      organizationId,
      {
        id: enrollment.classroomId,
        academicYearId: enrollment.academicYearId,
      },
      [enrollment.id],
    );

    return {
      ...base,
      reportCard: {
        ...describeEnrollment(enrollment),
        ...cardFor(enrollment.id),
      },
    };
  };

  // Un PDF con un boletín, o el de todo un salón.
  private toPdf = async (
    cards: PrintableReportCard[],
    periodId: string | undefined,
    filename: string,
  ): Promise<ReportCardPdf> => {
    const periods = cards[0]?.reportCard.periods ?? [];
    const period = periodId && periods.find(({ id }) => id === periodId);
    if (periodId && !period)
      throw new NotFoundException(REPORT_CARD_PERIOD_NOT_FOUND_MESSAGE);

    const suffix = period ? `-${period.name}` : '';
    return {
      filename: slugify(`${filename}${suffix}`) + '.pdf',
      content: await renderReportCardsPdf(cards, {
        periodId,
        title: `Boletín ${filename}${suffix}`,
      }),
    };
  };

  private cardPdf = async (
    data: Awaited<ReturnType<ReportCardsService['buildReportCard']>>,
    periodId?: string,
  ) => {
    if (!data.reportCard)
      throw new NotFoundException(REPORT_CARD_NOT_FOUND_MESSAGE);
    const { student, reportCard } = data;
    return await this.toPdf(
      [{ ...data, reportCard }],
      periodId,
      `boletin ${student.lastName} ${student.firstName} ${reportCard.academicYear.name}`,
    );
  };

  public getOwnReportCardPdf = async (
    actor: Pick<AuthContextInterface, 'organizationId' | 'userId'>,
    { academicYearId, periodId }: GetReportCardPdfDto,
  ) =>
    await this.cardPdf(
      await this.getOwnReportCard(actor, academicYearId),
      periodId,
    );

  public lookupReportCardPdf = async (
    slug: string,
    { periodId, ...dto }: LookupReportCardPdfDto,
  ) => await this.cardPdf(await this.lookupReportCard(slug, dto), periodId);

  public getEnrollmentReportCardPdf = async (
    actor: Actor,
    enrollmentId: string,
    periodId?: string,
  ) =>
    await this.cardPdf(
      await this.getEnrollmentReportCard(actor, enrollmentId),
      periodId,
    );

  // Todos los boletines de un salón en un solo PDF (por apellido), para el
  // admin o el director de grupo. Los retirados y trasladados no se imprimen.
  // Salón cuyos boletines puede imprimir quien consulta: el admin, cualquiera
  // de su organización; el profesor, solo el de su dirección de grupo.
  private findPrintableClassroom = async (
    actor: Actor,
    classroomId: string,
  ) => {
    const classroom = await this.classroomRepository.findOne(
      { id: classroomId, organizationId: organizationOf(actor) },
      false,
      {
        attributes: ['id', 'name', 'academicYearId', 'homeroomTeacherId'],
        include: [
          { model: AcademicYearModel, attributes: ['id', 'name', 'status'] },
          ...CLASSROOM_INCLUDE.include,
        ],
      },
    );
    if (
      !classroom?.academicYear ||
      (actor.roleName === RoleNameEnum.TEACHER &&
        classroom.homeroomTeacherId !== actor.userId)
    )
      throw new NotFoundException(REPORT_CARD_CLASSROOM_NOT_FOUND_MESSAGE);
    return classroom;
  };

  // Periodos del año del salón, para elegir cuál imprimir.
  public listClassroomPeriods = async (actor: Actor, classroomId: string) => {
    const classroom = await this.findPrintableClassroom(actor, classroomId);
    return await this.academicPeriodRepository.findAll(
      { academicYearId: classroom.academicYearId },
      {
        attributes: ['id', 'name', 'orderIndex'],
        order: [['orderIndex', 'ASC']],
      },
    );
  };

  public getClassroomReportCardsPdf = async (
    actor: Actor,
    classroomId: string,
    periodId?: string,
  ) => {
    const organizationId = organizationOf(actor);
    const classroom = await this.findPrintableClassroom(actor, classroomId);

    const [organization, enrollments] = await Promise.all([
      this.organizationRepository.findByPk(organizationId, true, {
        attributes: ['name'],
      }),
      this.enrollmentRepository.findAll(
        {
          classroomId: classroom.id,
          status: { [Op.notIn]: NOT_PRINTED_STATUSES },
        },
        {
          attributes: ['id', 'status'],
          include: [{ model: StudentModel, attributes: STUDENT_ATTRIBUTES }],
          order: [
            [{ model: StudentModel, as: 'student' }, 'lastName', 'ASC'],
            [{ model: StudentModel, as: 'student' }, 'firstName', 'ASC'],
          ],
        },
      ),
    ]);
    if (!enrollments.length)
      throw new NotFoundException(REPORT_CARD_CLASSROOM_EMPTY_MESSAGE);

    const cardFor = await this.loadClassroomCards(
      organizationId,
      { id: classroom.id, academicYearId: classroom.academicYearId },
      enrollments.map(({ id }) => id),
    );

    return await this.toPdf(
      enrollments.map((enrollment) => ({
        organization: { name: organization!.name },
        student: publicStudent(enrollment.student!),
        reportCard: {
          ...describeEnrollment({
            ...enrollment,
            academicYear: classroom.academicYear,
            classroom,
          }),
          ...cardFor(enrollment.id),
        },
      })),
      periodId,
      `boletines ${classroom.name} ${classroom.academicYear!.name}`,
    );
  };
}
