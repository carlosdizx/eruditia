import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreationAttributes, Transaction } from 'sequelize';
import type AuthContextInterface from '@auth/interfaces/auth-context.interface';
import AcademicPeriodModel from '@database/models/academic-period.model';
import AcademicYearModel from '@database/models/academic-year.model';
import ClassroomModel from '@database/models/classroom.model';
import ClassroomSubjectModel from '@database/models/classroom-subject.model';
import EvaluationItemModel from '@database/models/evaluation-item.model';
import GradeLevelModel from '@database/models/grade-level.model';
import PeriodSubjectSummaryModel from '@database/models/period-subject-summary.model';
import StudentGradeModel from '@database/models/student-grade.model';
import StudentModel from '@database/models/student.model';
import SubjectModel from '@database/models/subject.model';
import UserModel from '@database/models/user.model';
import AcademicYearStatusEnum from '@common/enums/academic-year-status.enum';
import EnrollmentStatusEnum from '@common/enums/enrollment-status.enum';
import RoleNameEnum from '@common/enums/role-name.enum';
import organizationOf from '@common/utils/organization-of.util';
import { hasAtMostDecimals } from '@common/utils/score.util';
import AcademicPeriodRepository from '../academic-years/repositories/academic-period.repository';
import ClassroomRepository from '../classrooms/classroom.repository';
import ClassroomSubjectRepository from '../classroom-subjects/classroom-subject.repository';
import EnrollmentRepository from '../enrollments/enrollment.repository';
import GradingScalesService, {
  type GradingScale,
} from '../grading-scales/grading-scales.service';
import EvaluationItemRepository from './repositories/evaluation-item.repository';
import StudentGradeRepository from './repositories/student-grade.repository';
import PeriodSubjectSummaryRepository from './repositories/period-subject-summary.repository';
import periodScore from './utils/period-score.util';
import annualScore from './utils/annual-score.util';
import SetEvaluationItemsDto from './dto/set-evaluation-items.dto';
import SaveGradesDto from './dto/save-grades.dto';
import {
  EVALUATION_ITEMS_WEIGHT_MESSAGE,
  GRADEBOOK_NOT_FOUND_MESSAGE,
  GRADEBOOK_PERIOD_CLOSED_MESSAGE,
  GRADEBOOK_PERIOD_NOT_FOUND_MESSAGE,
  GRADEBOOK_READ_ONLY_MESSAGE,
  GRADEBOOK_YEAR_CLOSED_MESSAGE,
  INVALID_EVALUATION_ITEMS_MESSAGE,
  INVALID_GRADE_ENROLLMENTS_MESSAGE,
  SCORE_DECIMALS_MESSAGE,
  SCORE_OUT_OF_RANGE_MESSAGE,
} from './constants/gradebook-messages.constant';

type Viewer = Pick<
  AuthContextInterface,
  'organizationId' | 'userId' | 'roleName'
>;

// Por qué la planilla no se puede editar (null: se puede).
export type GradebookLock = 'read_only' | 'year_closed' | 'period_closed';

const LOCK_EXCEPTIONS: Record<GradebookLock, () => Error> = {
  read_only: () => new ForbiddenException(GRADEBOOK_READ_ONLY_MESSAGE),
  year_closed: () => new ConflictException(GRADEBOOK_YEAR_CLOSED_MESSAGE),
  period_closed: () => new ConflictException(GRADEBOOK_PERIOD_CLOSED_MESSAGE),
};

export const DEFAULT_EVALUATION_ITEM = {
  title: 'Nota del periodo',
  weightPercentage: 100,
};

const STUDENT_ATTRIBUTES = [
  'id',
  'studentCode',
  'documentType',
  'documentNumber',
  'firstName',
  'lastName',
];
const PERIOD_ATTRIBUTES = [
  'id',
  'name',
  'orderIndex',
  'weightPercentage',
  'isOpenForGrading',
];
const SUBJECT_ATTRIBUTES = ['id', 'name', 'code', 'areaName'];
const TEACHER_INCLUDE = {
  model: UserModel,
  as: 'teacher',
  attributes: ['id', 'firstName', 'lastName'],
};

type GradeKey = `${string}:${string}`;
const gradeKey = (enrollmentId: string, evaluationItemId: string): GradeKey =>
  `${enrollmentId}:${evaluationItemId}`;

type StoredGrade = { score: number; feedback: string | null };

interface GradebookContext {
  organizationId: string;
  assignment: ClassroomSubjectModel;
  classroom: ClassroomModel;
  periods: AcademicPeriodModel[];
  isTeacher: boolean;
  canManage: boolean;
}

const fullName = ({ firstName, lastName }: StudentModel) =>
  `${firstName} ${lastName}`;

@Injectable()
export default class GradebooksService {
  constructor(
    private readonly classroomSubjectRepository: ClassroomSubjectRepository,
    private readonly classroomRepository: ClassroomRepository,
    private readonly academicPeriodRepository: AcademicPeriodRepository,
    private readonly enrollmentRepository: EnrollmentRepository,
    private readonly evaluationItemRepository: EvaluationItemRepository,
    private readonly studentGradeRepository: StudentGradeRepository,
    private readonly periodSubjectSummaryRepository: PeriodSubjectSummaryRepository,
    private readonly gradingScalesService: GradingScalesService,
  ) {}

  // El profesor solo ve las materias que dicta y, en modo lectura, las de los
  // salones donde es director de grupo. Lo demás responde 404.
  private loadContext = async (
    actor: Viewer,
    classroomSubjectId: string,
  ): Promise<GradebookContext> => {
    const organizationId = organizationOf(actor);

    const assignment = await this.classroomSubjectRepository.findOne(
      { id: classroomSubjectId, organizationId },
      false,
      {
        attributes: ['id', 'classroomId', 'subjectId', 'teacherId'],
        include: [
          { model: SubjectModel, attributes: SUBJECT_ATTRIBUTES },
          TEACHER_INCLUDE,
          {
            model: ClassroomModel,
            attributes: ['id', 'name', 'academicYearId', 'homeroomTeacherId'],
            include: [
              { model: GradeLevelModel, attributes: ['id', 'name'] },
              {
                model: AcademicYearModel,
                attributes: ['id', 'name', 'status'],
              },
            ],
          },
        ],
      },
    );
    if (!assignment?.classroom)
      throw new NotFoundException(GRADEBOOK_NOT_FOUND_MESSAGE);

    const { classroom } = assignment;
    const isTeacher = actor.roleName === RoleNameEnum.TEACHER;
    const ownsSubject = assignment.teacherId === actor.userId;
    if (
      isTeacher &&
      !ownsSubject &&
      classroom.homeroomTeacherId !== actor.userId
    )
      throw new NotFoundException(GRADEBOOK_NOT_FOUND_MESSAGE);

    const periods = await this.academicPeriodRepository.findAll(
      { academicYearId: classroom.academicYearId },
      { attributes: PERIOD_ATTRIBUTES, order: [['orderIndex', 'ASC']] },
    );

    return {
      organizationId,
      assignment,
      classroom,
      periods,
      isTeacher,
      canManage: !isTeacher || ownsSubject,
    };
  };

  // El admin califica aunque el periodo esté cerrado; nadie en un año cerrado.
  private lockOf = (
    { canManage, isTeacher, classroom }: GradebookContext,
    period: AcademicPeriodModel,
  ): GradebookLock | null => {
    if (!canManage) return 'read_only';
    if (classroom.academicYear?.status === AcademicYearStatusEnum.CLOSED)
      return 'year_closed';
    if (isTeacher && !period.isOpenForGrading) return 'period_closed';
    return null;
  };

  private assertEditable = (
    context: GradebookContext,
    period: AcademicPeriodModel,
  ) => {
    const lock = this.lockOf(context, period);
    if (lock) throw LOCK_EXCEPTIONS[lock]();
  };

  private findPeriod = (periods: AcademicPeriodModel[], periodId: string) => {
    const period = periods.find(({ id }) => id === periodId);
    if (!period)
      throw new NotFoundException(GRADEBOOK_PERIOD_NOT_FOUND_MESSAGE);
    return period;
  };

  private listItems = async (
    classroomSubjectId: string,
    academicPeriodId: string,
  ) =>
    await this.evaluationItemRepository.findAll(
      { classroomSubjectId, academicPeriodId },
      {
        attributes: ['id', 'title', 'weightPercentage', 'sortOrder'],
        order: [['sortOrder', 'ASC']],
      },
    );

  private listEnrollments = async (classroomId: string) =>
    await this.enrollmentRepository.findAll(
      { classroomId },
      {
        attributes: ['id', 'studentId', 'status'],
        include: [{ model: StudentModel, attributes: STUDENT_ATTRIBUTES }],
        order: [
          [{ model: StudentModel, as: 'student' }, 'lastName', 'ASC'],
          [{ model: StudentModel, as: 'student' }, 'firstName', 'ASC'],
        ],
      },
    );

  private loadGrades = async (itemIds: string[], transaction?: Transaction) => {
    const grades = itemIds.length
      ? await this.studentGradeRepository.findAll(
          { evaluationItemId: itemIds },
          {
            attributes: [
              'enrollmentId',
              'evaluationItemId',
              'score',
              'feedback',
            ],
            transaction,
          },
        )
      : [];
    return new Map<GradeKey, StoredGrade>(
      grades.map(({ enrollmentId, evaluationItemId, score, feedback }) => [
        gradeKey(enrollmentId, evaluationItemId),
        { score, feedback },
      ]),
    );
  };

  private loadSummaries = async (
    classroomSubjectId: string,
    academicPeriodId: string,
  ) =>
    new Map(
      (
        await this.periodSubjectSummaryRepository.findAll(
          { classroomSubjectId, academicPeriodId },
          {
            attributes: [
              'enrollmentId',
              'finalPeriodScore',
              'isPassed',
              'teacherObservation',
            ],
          },
        )
      ).map((summary) => [summary.enrollmentId, summary]),
    );

  // Definitivas recalculadas de las matrículas indicadas, listas para upsert.
  private buildSummaries = (
    { organizationId, assignment }: GradebookContext,
    period: AcademicPeriodModel,
    items: Pick<EvaluationItemModel, 'id' | 'weightPercentage'>[],
    grades: Map<GradeKey, StoredGrade>,
    observations: Map<string, string | null>,
    enrollmentIds: Iterable<string>,
    scale: GradingScale,
  ): CreationAttributes<PeriodSubjectSummaryModel>[] =>
    [...new Set(enrollmentIds)].map((enrollmentId) => {
      const graded = items.flatMap(({ id, weightPercentage }) => {
        const grade = grades.get(gradeKey(enrollmentId, id));
        return grade ? [{ score: grade.score, weightPercentage }] : [];
      });
      const finalPeriodScore = periodScore(graded, scale.decimalPlaces);
      return {
        organizationId,
        enrollmentId,
        classroomSubjectId: assignment.id,
        academicPeriodId: period.id,
        finalPeriodScore,
        isPassed:
          finalPeriodScore === null
            ? null
            : finalPeriodScore >= scale.passingScore,
        teacherObservation: observations.get(enrollmentId) ?? null,
      };
    });

  private describe = async ({
    organizationId,
    assignment,
    classroom,
    periods,
  }: GradebookContext) => ({
    classroomSubject: {
      id: assignment.id,
      subject: assignment.subject,
      teacher: assignment.teacher ?? null,
    },
    classroom: {
      id: classroom.id,
      name: classroom.name,
      gradeLevel: classroom.gradeLevel,
    },
    academicYear: classroom.academicYear,
    periods,
    scale: await this.gradingScalesService.findScale(organizationId),
  });

  // Planilla del periodo: filas = matrículas del salón (por apellido),
  // columnas = actividades. Si el profesor no ha creado actividades se crea la
  // columna única "Nota del periodo (100%)".
  public getGradebook = async (
    actor: Viewer,
    classroomSubjectId: string,
    periodId?: string,
  ) => {
    const context = await this.loadContext(actor, classroomSubjectId);
    const { assignment, classroom, periods } = context;
    const period = periodId
      ? this.findPeriod(periods, periodId)
      : (periods.find(({ isOpenForGrading }) => isOpenForGrading) ??
        periods[periods.length - 1]);

    const base = await this.describe(context);
    if (!period)
      return { ...base, period: null, lock: null, items: [], students: [] };

    const lock = this.lockOf(context, period);
    let items = await this.listItems(assignment.id, period.id);
    if (!items.length && !lock) {
      await this.evaluationItemRepository.create({
        ...DEFAULT_EVALUATION_ITEM,
        sortOrder: 0,
        organizationId: context.organizationId,
        classroomSubjectId: assignment.id,
        academicPeriodId: period.id,
      });
      items = await this.listItems(assignment.id, period.id);
    }

    const [enrollments, grades, summaries] = await Promise.all([
      this.listEnrollments(classroom.id),
      this.loadGrades(items.map(({ id }) => id)),
      this.loadSummaries(assignment.id, period.id),
    ]);

    return {
      ...base,
      period,
      lock,
      items,
      students: enrollments.map(({ id, status, student }) => {
        const summary = summaries.get(id);
        return {
          enrollmentId: id,
          status,
          student,
          // Los retirados o trasladados conservan sus notas en solo lectura.
          editable: status === EnrollmentStatusEnum.IN_PROGRESS,
          grades: Object.fromEntries(
            items.flatMap(({ id: itemId }) => {
              const grade = grades.get(gradeKey(id, itemId));
              return grade ? [[itemId, grade]] : [];
            }),
          ),
          finalPeriodScore: summary?.finalPeriodScore ?? null,
          isPassed: summary?.isPassed ?? null,
          teacherObservation: summary?.teacherObservation ?? null,
        };
      }),
    };
  };

  // Acumulado anual de la materia: definitiva de cada periodo ponderada por
  // su peso, proyección de la nota final y estado de cada estudiante.
  public getAnnualSummary = async (
    actor: Viewer,
    classroomSubjectId: string,
  ) => {
    const context = await this.loadContext(actor, classroomSubjectId);
    const { assignment, classroom, periods } = context;

    const [base, enrollments, summaries] = await Promise.all([
      this.describe(context),
      this.listEnrollments(classroom.id),
      this.periodSubjectSummaryRepository.findAll(
        { classroomSubjectId: assignment.id },
        {
          attributes: ['enrollmentId', 'academicPeriodId', 'finalPeriodScore'],
        },
      ),
    ]);
    const scores = new Map(
      summaries.map(({ enrollmentId, academicPeriodId, finalPeriodScore }) => [
        `${enrollmentId}:${academicPeriodId}`,
        finalPeriodScore,
      ]),
    );

    return {
      ...base,
      students: enrollments.map(({ id, status, student }) => {
        const periodScores = periods.map(
          ({ id: periodId, weightPercentage }) => ({
            periodId,
            weightPercentage,
            score: scores.get(`${id}:${periodId}`) ?? null,
          }),
        );
        return {
          enrollmentId: id,
          status,
          student,
          periodScores: Object.fromEntries(
            periodScores.map(({ periodId, score }) => [periodId, score]),
          ),
          annual: annualScore(periodScores, base.scale),
        };
      }),
    };
  };

  // Reemplaza las actividades del periodo (los pesos suman 100%). Las que no
  // vienen se borran con sus notas y se recalculan las definitivas.
  public setEvaluationItems = async (
    actor: Viewer,
    classroomSubjectId: string,
    periodId: string,
    { items }: SetEvaluationItemsDto,
  ) => {
    const context = await this.loadContext(actor, classroomSubjectId);
    const period = this.findPeriod(context.periods, periodId);
    this.assertEditable(context, period);

    const total =
      Math.round(
        items.reduce((sum, { weightPercentage }) => sum + weightPercentage, 0) *
          100,
      ) / 100;
    if (total !== 100)
      throw new BadRequestException(EVALUATION_ITEMS_WEIGHT_MESSAGE(total));

    const current = await this.listItems(context.assignment.id, period.id);
    const currentIds = new Set(current.map(({ id }) => id));
    if (items.some(({ id }) => id && !currentIds.has(id)))
      throw new BadRequestException(INVALID_EVALUATION_ITEMS_MESSAGE);

    const keepIds = items.flatMap(({ id }) => (id ? [id] : []));
    const [scale, grades, summaries] = await Promise.all([
      this.gradingScalesService.findScale(context.organizationId),
      this.loadGrades(keepIds),
      this.loadSummaries(context.assignment.id, period.id),
    ]);

    await this.evaluationItemRepository.transaction(async (transaction) => {
      await this.evaluationItemRepository.deleteOthers(
        context.assignment.id,
        period.id,
        keepIds,
        transaction,
      );

      const created = await this.evaluationItemRepository.insertMany(
        items.flatMap(({ id, title, weightPercentage }, sortOrder) =>
          id
            ? []
            : [
                {
                  title,
                  weightPercentage,
                  sortOrder,
                  organizationId: context.organizationId,
                  classroomSubjectId: context.assignment.id,
                  academicPeriodId: period.id,
                },
              ],
        ),
        { transaction },
      );
      for (const [
        sortOrder,
        { id, title, weightPercentage },
      ] of items.entries())
        if (id)
          await this.evaluationItemRepository.updateByPk(
            id,
            { title, weightPercentage, sortOrder },
            { transaction },
          );

      const finalItems = [
        ...items.flatMap(({ id, weightPercentage }) =>
          id ? [{ id, weightPercentage }] : [],
        ),
        ...created,
      ];
      const observations = new Map(
        [...summaries].map(([id, { teacherObservation }]) => [
          id,
          teacherObservation,
        ]),
      );
      const enrollmentIds = [
        ...summaries.keys(),
        ...[...grades.keys()].map((key) => key.split(':')[0]),
      ];
      await this.periodSubjectSummaryRepository.upsertMany(
        this.buildSummaries(
          context,
          period,
          finalItems,
          grades,
          observations,
          enrollmentIds,
          scale,
        ),
        transaction,
      );
    });

    return await this.getGradebook(actor, classroomSubjectId, period.id);
  };

  // Guardado en lote: solo las filas que cambiaron. Valida todo antes de
  // escribir y recalcula la definitiva de cada fila en la misma transacción.
  public saveGrades = async (
    actor: Viewer,
    classroomSubjectId: string,
    periodId: string,
    { students }: SaveGradesDto,
  ) => {
    const context = await this.loadContext(actor, classroomSubjectId);
    const period = this.findPeriod(context.periods, periodId);
    this.assertEditable(context, period);

    const [scale, items, enrollments, summaries] = await Promise.all([
      this.gradingScalesService.findScale(context.organizationId),
      this.listItems(context.assignment.id, period.id),
      this.listEnrollments(context.classroom.id),
      this.loadSummaries(context.assignment.id, period.id),
    ]);
    const itemIds = new Set(items.map(({ id }) => id));
    const editable = new Map(
      enrollments
        .filter(({ status }) => status === EnrollmentStatusEnum.IN_PROGRESS)
        .map((enrollment) => [enrollment.id, enrollment]),
    );

    const format = (value: number) => value.toFixed(scale.decimalPlaces);
    for (const { enrollmentId, grades = [] } of students) {
      const enrollment = editable.get(enrollmentId);
      if (!enrollment)
        throw new BadRequestException(INVALID_GRADE_ENROLLMENTS_MESSAGE);

      for (const { evaluationItemId, score } of grades) {
        if (!itemIds.has(evaluationItemId))
          throw new BadRequestException(INVALID_EVALUATION_ITEMS_MESSAGE);
        if (score === null) continue;

        const name = fullName(enrollment.student!);
        if (score < scale.minScore || score > scale.maxScore)
          throw new BadRequestException(
            SCORE_OUT_OF_RANGE_MESSAGE(
              name,
              format(scale.minScore),
              format(scale.maxScore),
            ),
          );
        if (!hasAtMostDecimals(score, scale.decimalPlaces))
          throw new BadRequestException(
            SCORE_DECIMALS_MESSAGE(name, scale.decimalPlaces),
          );
      }
    }

    const grades = await this.loadGrades([...itemIds]);
    const upserts: CreationAttributes<StudentGradeModel>[] = [];
    const deletes: { enrollmentId: string; evaluationItemId: string }[] = [];
    const observations = new Map(
      [...summaries].map(([id, { teacherObservation }]) => [
        id,
        teacherObservation,
      ]),
    );

    for (const {
      enrollmentId,
      grades: entries = [],
      teacherObservation,
    } of students) {
      if (teacherObservation !== undefined)
        observations.set(enrollmentId, teacherObservation?.trim() || null);

      for (const { evaluationItemId, score, feedback } of entries) {
        const key = gradeKey(enrollmentId, evaluationItemId);
        if (score === null) {
          grades.delete(key);
          deletes.push({ enrollmentId, evaluationItemId });
          continue;
        }
        const grade = {
          score,
          feedback:
            feedback === undefined
              ? (grades.get(key)?.feedback ?? null)
              : feedback?.trim() || null,
        };
        grades.set(key, grade);
        upserts.push({
          ...grade,
          organizationId: context.organizationId,
          enrollmentId,
          evaluationItemId,
          updatedBy: actor.userId,
        });
      }
    }

    await this.studentGradeRepository.transaction(async (transaction) => {
      await this.studentGradeRepository.deleteMany(deletes, transaction);
      await this.studentGradeRepository.upsertMany(upserts, transaction);
      await this.periodSubjectSummaryRepository.upsertMany(
        this.buildSummaries(
          context,
          period,
          items,
          grades,
          observations,
          students.map(({ enrollmentId }) => enrollmentId),
          scale,
        ),
        transaction,
      );
    });

    return await this.getGradebook(actor, classroomSubjectId, period.id);
  };

  // Materias del salón con planilla visible para quien consulta: el admin las
  // ve todas; el profesor las que dicta, o todas si es director de grupo.
  public listClassroomGradebooks = async (
    actor: Viewer,
    classroomId: string,
  ) => {
    const organizationId = organizationOf(actor);
    const classroom = (await this.classroomRepository.findOne(
      { id: classroomId, organizationId },
      true,
      {
        attributes: ['id', 'name', 'homeroomTeacherId'],
        include: [
          { model: GradeLevelModel, attributes: ['id', 'name'] },
          { model: AcademicYearModel, attributes: ['id', 'name', 'status'] },
        ],
      },
    ))!;

    const isTeacher = actor.roleName === RoleNameEnum.TEACHER;
    const homeroom = classroom.homeroomTeacherId === actor.userId;

    const assignments = await this.classroomSubjectRepository.findAll(
      {
        classroomId,
        ...(isTeacher && !homeroom && { teacherId: actor.userId }),
      },
      {
        attributes: ['id', 'teacherId'],
        include: [
          { model: SubjectModel, attributes: SUBJECT_ATTRIBUTES },
          TEACHER_INCLUDE,
        ],
        order: [[{ model: SubjectModel, as: 'subject' }, 'name', 'ASC']],
      },
    );
    if (isTeacher && !homeroom && !assignments.length)
      throw new NotFoundException(GRADEBOOK_NOT_FOUND_MESSAGE);

    return {
      classroom: {
        id: classroom.id,
        name: classroom.name,
        gradeLevel: classroom.gradeLevel,
        academicYear: classroom.academicYear,
      },
      homeroom,
      gradebooks: assignments.map(({ id, teacherId, subject, teacher }) => ({
        id,
        subject,
        teacher: teacher ?? null,
        canManage: !isTeacher || teacherId === actor.userId,
      })),
    };
  };
}
