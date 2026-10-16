import {
  BadRequestException,
  ConflictException,
  Injectable,
} from '@nestjs/common';
import { Op, Transaction } from 'sequelize';
import type AuthContextInterface from '@auth/interfaces/auth-context.interface';
import AcademicYearModel from '@database/models/academic-year.model';
import ClassroomModel from '@database/models/classroom.model';
import GradeLevelModel from '@database/models/grade-level.model';
import StudentModel from '@database/models/student.model';
import AcademicYearStatusEnum from '@common/enums/academic-year-status.enum';
import EnrollmentStatusEnum from '@common/enums/enrollment-status.enum';
import PromotionOutcomeEnum from '@common/enums/promotion-outcome.enum';
import StudentStatusEnum from '@common/enums/student-status.enum';
import organizationOf, {
  type OrganizationActor,
} from '@common/utils/organization-of.util';
import AcademicYearsService from '../academic-years/academic-years.service';
import ClassroomsService from '../classrooms/classrooms.service';
import StudentsService from '../students/students.service';
import GradingScalesService, {
  type GradingScale,
} from '../grading-scales/grading-scales.service';
import AnnualResultsService from '../gradebooks/annual-results.service';
import EnrollmentsService, {
  STUDENT_ATTRIBUTES,
  today,
} from './enrollments.service';
import PromotionPreviewDto from './dto/promotion-preview.dto';
import PromoteStudentsDto from './dto/promote-students.dto';
import {
  ADJUSTED_AVERAGE_RANGE_MESSAGE,
  ADJUSTMENT_REASON_REQUIRED_MESSAGE,
  ALREADY_ENROLLED_MESSAGE,
  CLOSED_TARGET_YEAR_MESSAGE,
  GRADUATE_NOT_FINAL_MESSAGE,
  INVALID_PROMOTION_ENROLLMENTS_MESSAGE,
  INVALID_PROMOTION_TARGET_MESSAGE,
  MANUAL_DECISION_REASON_REQUIRED_MESSAGE,
  PAST_YEAR_PROMOTION_MESSAGE,
  PROMOTE_FINAL_MESSAGE,
  PROMOTION_TARGET_REQUIRED_MESSAGE,
  SAME_YEAR_PROMOTION_MESSAGE,
  TARGET_CLASSROOM_FULL_MESSAGE,
} from './constants/enrollment-messages.constant';

const YEAR_ATTRIBUTES = ['id', 'name', 'startDate', 'status'];
const GRADE_ATTRIBUTES = [
  'id',
  'name',
  'shortName',
  'sequenceOrder',
  'isFinalGrade',
];

// Estado con el que se cierra la matrícula del año de origen.
const CLOSING_STATUS = {
  [PromotionOutcomeEnum.PROMOTE]: EnrollmentStatusEnum.PROMOTED,
  [PromotionOutcomeEnum.REPEAT]: EnrollmentStatusEnum.FAILED,
  [PromotionOutcomeEnum.GRADUATE]: EnrollmentStatusEnum.GRADUATED,
};

const fullName = ({ firstName, lastName }: StudentModel) =>
  `${firstName} ${lastName}`;

// Reprueba el año con maxFailedSubjects materias perdidas o, si el colegio
// lo activa, con el promedio general bajo la aprobatoria. Sin notas no hay
// sugerencia.
export const suggestOutcome = (
  average: number | null,
  failedSubjects: number,
  { passingScore, maxFailedSubjects, failByAverage }: GradingScale,
  isFinalGrade: boolean,
) => {
  if (average === null) return null;
  if (
    (maxFailedSubjects !== null && failedSubjects >= maxFailedSubjects) ||
    (failByAverage && average < passingScore)
  )
    return PromotionOutcomeEnum.REPEAT;
  return isFinalGrade
    ? PromotionOutcomeEnum.GRADUATE
    : PromotionOutcomeEnum.PROMOTE;
};

// Aprueba (promueve o gradúa) o reprueba; null: sin sugerencia.
const passes = (outcome: PromotionOutcomeEnum | null) =>
  outcome === null ? null : outcome !== PromotionOutcomeEnum.REPEAT;

@Injectable()
export default class PromotionsService {
  constructor(
    private readonly enrollmentsService: EnrollmentsService,
    private readonly classroomsService: ClassroomsService,
    private readonly academicYearsService: AcademicYearsService,
    private readonly studentsService: StudentsService,
    private readonly gradingScalesService: GradingScalesService,
    private readonly annualResultsService: AnnualResultsService,
  ) {}

  // Salón de origen y año destino (posterior y abierto), con los salones del
  // destino donde puede continuar: los del mismo grado (repitentes) y los del
  // grado siguiente (el sequence_order inmediato superior).
  private loadContext = async (
    organizationId: string,
    { sourceClassroomId, targetAcademicYearId }: PromotionPreviewDto,
  ) => {
    const source = (await this.classroomsService.findOne(
      { id: sourceClassroomId, organizationId },
      true,
      {
        attributes: ['id', 'name', 'academicYearId', 'gradeLevelId'],
        include: [
          { model: AcademicYearModel, attributes: YEAR_ATTRIBUTES },
          { model: GradeLevelModel, attributes: GRADE_ATTRIBUTES },
        ],
      },
    ))!;
    const target = (await this.academicYearsService.findOne(
      { id: targetAcademicYearId, organizationId },
      true,
      { attributes: YEAR_ATTRIBUTES },
    ))!;

    if (target.id === source.academicYearId)
      throw new BadRequestException(SAME_YEAR_PROMOTION_MESSAGE);
    if (target.startDate <= source.academicYear!.startDate)
      throw new BadRequestException(PAST_YEAR_PROMOTION_MESSAGE);
    if (target.status === AcademicYearStatusEnum.CLOSED)
      throw new ConflictException(CLOSED_TARGET_YEAR_MESSAGE);

    const grade = source.gradeLevel!;
    const classrooms = await this.classroomsService.findAll(
      { organizationId, academicYearId: target.id },
      {
        attributes: ['id', 'name', 'capacity', 'gradeLevelId'],
        include: [
          {
            model: GradeLevelModel,
            attributes: GRADE_ATTRIBUTES,
            where: { sequenceOrder: { [Op.gte]: grade.sequenceOrder } },
            required: true,
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
    const nextSequence = classrooms.find(
      ({ gradeLevel }) => gradeLevel!.sequenceOrder > grade.sequenceOrder,
    )?.gradeLevel!.sequenceOrder;

    return {
      source,
      grade,
      target,
      sameClassrooms: classrooms.filter(
        ({ gradeLevelId }) => gradeLevelId === grade.id,
      ),
      // Desde el último grado no se promueve: se gradúa.
      nextClassrooms: grade.isFinalGrade
        ? []
        : classrooms.filter(
            ({ gradeLevel }) => gradeLevel!.sequenceOrder === nextSequence,
          ),
    };
  };

  // Matrículas en curso por salón.
  private countEnrolled = async (classroomIds: string[]) => {
    const enrollments = classroomIds.length
      ? await this.enrollmentsService.findAll(
          {
            classroomId: classroomIds,
            status: EnrollmentStatusEnum.IN_PROGRESS,
          },
          { attributes: ['classroomId'] },
        )
      : [];
    const counts = new Map<string, number>();
    for (const { classroomId } of enrollments)
      counts.set(classroomId, (counts.get(classroomId) ?? 0) + 1);
    return counts;
  };

  // Resultado anual de cada matrícula según las planillas.
  private loadResults = async (
    source: ClassroomModel,
    enrollmentIds: string[],
    scale: GradingScale,
  ) => {
    const { resultsFor } = await this.annualResultsService.loadClassroom(
      { id: source.id, academicYearId: source.academicYearId },
      enrollmentIds,
      scale,
    );
    return new Map(
      enrollmentIds.map((id) => {
        const { averages, failedSubjects, incomplete } = resultsFor(id);
        return [
          id,
          {
            computedAverage: averages.general,
            failedSubjects: failedSubjects.map(({ subject }) => subject.name),
            incomplete,
          },
        ];
      }),
    );
  };

  // Revisión previa: estudiantes en curso del salón con el promedio calculado
  // de las planillas y la decisión sugerida según las reglas de la escala.
  public preview = async (
    actor: OrganizationActor,
    dto: PromotionPreviewDto,
  ) => {
    const organizationId = organizationOf(actor);
    const { source, grade, target, sameClassrooms, nextClassrooms } =
      await this.loadContext(organizationId, dto);
    const scale = await this.gradingScalesService.findScale(organizationId);

    const [enrollments, siblings] = await Promise.all([
      this.enrollmentsService.findAll(
        { classroomId: source.id, status: EnrollmentStatusEnum.IN_PROGRESS },
        {
          attributes: ['id', 'studentId', 'finalAverage', 'promotionNotes'],
          include: [{ model: StudentModel, attributes: STUDENT_ATTRIBUTES }],
          order: [
            [{ model: StudentModel, as: 'student' }, 'lastName', 'ASC'],
            [{ model: StudentModel, as: 'student' }, 'firstName', 'ASC'],
          ],
        },
      ),
      // Salones del mismo grado en el año de origen, para sugerir la misma
      // sección (1°A -> 2°A).
      this.classroomsService.findAll(
        {
          organizationId,
          academicYearId: source.academicYearId,
          gradeLevelId: grade.id,
        },
        { attributes: ['id'], order: [['name', 'ASC']] },
      ),
    ]);

    const results = await this.loadResults(
      source,
      enrollments.map(({ id }) => id),
      scale,
    );

    const studentIds = enrollments.map(({ studentId }) => studentId);
    const alreadyEnrolled = studentIds.length
      ? await this.enrollmentsService.findAll(
          {
            academicYearId: target.id,
            status: EnrollmentStatusEnum.IN_PROGRESS,
            studentId: studentIds,
          },
          {
            attributes: ['studentId', 'classroomId'],
            include: [{ model: ClassroomModel, attributes: ['id', 'name'] }],
          },
        )
      : [];
    const targetEnrollments = new Map(
      alreadyEnrolled.map(({ studentId, classroom }) => [
        studentId,
        { classroomId: classroom!.id, classroomName: classroom!.name },
      ]),
    );

    const enrolled = await this.countEnrolled(
      [...sameClassrooms, ...nextClassrooms].map(({ id }) => id),
    );
    const toOption = ({ id, name, capacity }: ClassroomModel) => ({
      id,
      name,
      capacity,
      enrolled: enrolled.get(id) ?? 0,
    });
    const position = Math.max(
      siblings.findIndex(({ id }) => id === source.id),
      0,
    );
    const samePosition = (classrooms: ClassroomModel[]) =>
      classrooms[Math.min(position, classrooms.length - 1)]?.id ?? null;

    return {
      sourceClassroom: {
        id: source.id,
        name: source.name,
        gradeLevel: grade,
        academicYear: source.academicYear,
      },
      targetAcademicYear: target,
      passingGrade: scale.passingScore,
      scale,
      sameClassrooms: sameClassrooms.map(toOption),
      nextClassrooms: nextClassrooms.map(toOption),
      nextGradeLevel: nextClassrooms[0]?.gradeLevel ?? null,
      suggestedSameClassroomId: samePosition(sameClassrooms),
      suggestedNextClassroomId: samePosition(nextClassrooms),
      students: enrollments.map((enrollment) => {
        const result = results.get(enrollment.id)!;
        return {
          enrollmentId: enrollment.id,
          student: enrollment.student,
          ...result,
          promotionNotes: enrollment.promotionNotes,
          suggestedOutcome: suggestOutcome(
            result.computedAverage,
            result.failedSubjects.length,
            scale,
            grade.isFinalGrade,
          ),
          targetEnrollment: targetEnrollments.get(enrollment.studentId) ?? null,
        };
      }),
    };
  };

  // Cierra las matrículas del año de origen con su estado definitivo y crea
  // las del año destino (enlazadas a la anterior), todo en una transacción.
  // El promedio se calcula de las planillas; ajustarlo o decidir en contra de
  // las notas exige el motivo.
  public promote = async (
    actor: Pick<AuthContextInterface, 'organizationId' | 'userId'>,
    dto: PromoteStudentsDto,
  ) => {
    const organizationId = organizationOf(actor);
    const { source, grade, target, sameClassrooms, nextClassrooms } =
      await this.loadContext(organizationId, dto);

    const enrollments = await this.enrollmentsService.findAll(
      {
        id: dto.decisions.map(({ enrollmentId }) => enrollmentId),
        classroomId: source.id,
        status: EnrollmentStatusEnum.IN_PROGRESS,
      },
      {
        attributes: ['id', 'studentId'],
        include: [
          { model: StudentModel, attributes: ['id', 'firstName', 'lastName'] },
        ],
      },
    );
    if (enrollments.length !== dto.decisions.length)
      throw new BadRequestException(INVALID_PROMOTION_ENROLLMENTS_MESSAGE);
    const studentOf = new Map(
      enrollments.map(({ id, studentId }) => [id, studentId]),
    );
    const nameOf = new Map(
      enrollments.map(({ id, student }) => [id, fullName(student!)]),
    );

    const allowed = {
      [PromotionOutcomeEnum.PROMOTE]: nextClassrooms,
      [PromotionOutcomeEnum.REPEAT]: sameClassrooms,
    };
    const incoming = new Map<string, number>();
    for (const { outcome, targetClassroomId } of dto.decisions) {
      if (outcome === PromotionOutcomeEnum.GRADUATE) {
        if (!grade.isFinalGrade)
          throw new BadRequestException(GRADUATE_NOT_FINAL_MESSAGE);
        continue;
      }
      if (outcome === PromotionOutcomeEnum.PROMOTE && grade.isFinalGrade)
        throw new BadRequestException(PROMOTE_FINAL_MESSAGE);
      if (!targetClassroomId)
        throw new BadRequestException(PROMOTION_TARGET_REQUIRED_MESSAGE);
      if (!allowed[outcome].some(({ id }) => id === targetClassroomId))
        throw new BadRequestException(INVALID_PROMOTION_TARGET_MESSAGE);
      incoming.set(
        targetClassroomId,
        (incoming.get(targetClassroomId) ?? 0) + 1,
      );
    }

    // Los que continúan no pueden tener ya matrícula en el año destino.
    const continuing = dto.decisions.filter(
      ({ outcome }) => outcome !== PromotionOutcomeEnum.GRADUATE,
    );
    if (continuing.length) {
      const already = new Set(
        (
          await this.enrollmentsService.findAll(
            {
              academicYearId: target.id,
              status: EnrollmentStatusEnum.IN_PROGRESS,
              studentId: continuing.map(({ enrollmentId }) =>
                studentOf.get(enrollmentId)!,
              ),
            },
            { attributes: ['studentId'] },
          )
        ).map(({ studentId }) => studentId),
      );
      if (already.size)
        throw new ConflictException(
          ALREADY_ENROLLED_MESSAGE(
            enrollments
              .filter(({ studentId }) => already.has(studentId))
              .map(({ student }) => fullName(student!)),
          ),
        );
    }

    const enrolled = await this.countEnrolled([...incoming.keys()]);
    for (const [classroomId, count] of incoming) {
      const classroom = [...sameClassrooms, ...nextClassrooms].find(
        ({ id }) => id === classroomId,
      )!;
      if (
        classroom.capacity &&
        (enrolled.get(classroomId) ?? 0) + count > classroom.capacity
      )
        throw new ConflictException(
          TARGET_CLASSROOM_FULL_MESSAGE(classroom.name, classroom.capacity),
        );
    }

    const scale = await this.gradingScalesService.findScale(organizationId);
    const results = await this.loadResults(
      source,
      enrollments.map(({ id }) => id),
      scale,
    );
    const format = (value: number) => value.toFixed(scale.decimalPlaces);
    const averages = new Map<
      string,
      {
        finalAverage: number | null;
        computedAverage: number | null;
        averageAdjustedBy: string | null;
      }
    >();
    for (const decision of dto.decisions) {
      const name = nameOf.get(decision.enrollmentId)!;
      const { computedAverage, failedSubjects } = results.get(
        decision.enrollmentId,
      )!;
      const notes = decision.promotionNotes?.trim();
      const adjusted =
        decision.adjustedAverage !== undefined &&
        decision.adjustedAverage !== computedAverage;

      if (adjusted) {
        const value = decision.adjustedAverage!;
        if (value < scale.minScore || value > scale.maxScore)
          throw new BadRequestException(
            ADJUSTED_AVERAGE_RANGE_MESSAGE(
              name,
              format(scale.minScore),
              format(scale.maxScore),
            ),
          );
        if (!notes)
          throw new BadRequestException(
            ADJUSTMENT_REASON_REQUIRED_MESSAGE(name),
          );
      }

      const finalAverage = adjusted
        ? decision.adjustedAverage!
        : computedAverage;
      const suggested = suggestOutcome(
        finalAverage,
        failedSubjects.length,
        scale,
        grade.isFinalGrade,
      );
      if (passes(suggested) !== passes(decision.outcome) && !notes)
        throw new BadRequestException(
          MANUAL_DECISION_REASON_REQUIRED_MESSAGE(name),
        );

      averages.set(decision.enrollmentId, {
        finalAverage,
        computedAverage,
        averageAdjustedBy: adjusted ? actor.userId : null,
      });
    }

    const enrollmentDate = dto.enrollmentDate ?? today();
    await this.enrollmentsService.transaction(
      async (transaction: Transaction) => {
        for (const decision of dto.decisions)
          await this.enrollmentsService.updateByPk(
            decision.enrollmentId,
            {
              status: CLOSING_STATUS[decision.outcome],
              ...averages.get(decision.enrollmentId)!,
              ...(decision.promotionNotes !== undefined && {
                promotionNotes: decision.promotionNotes.trim() || null,
              }),
            },
            { transaction },
          );

        if (continuing.length)
          await this.enrollmentsService.insertMany(
            continuing.map(({ enrollmentId, targetClassroomId }) => ({
              organizationId,
              studentId: studentOf.get(enrollmentId)!,
              academicYearId: target.id,
              classroomId: targetClassroomId!,
              enrollmentDate,
              promotedFromEnrollmentId: enrollmentId,
            })),
            { transaction },
          );

        for (const { enrollmentId, outcome } of dto.decisions)
          if (outcome === PromotionOutcomeEnum.GRADUATE)
            await this.studentsService.updateByPk(
              studentOf.get(enrollmentId)!,
              { status: StudentStatusEnum.GRADUATED },
              { transaction },
            );
      },
    );

    const count = (outcome: PromotionOutcomeEnum) =>
      dto.decisions.filter((decision) => decision.outcome === outcome).length;
    return {
      promoted: count(PromotionOutcomeEnum.PROMOTE),
      repeated: count(PromotionOutcomeEnum.REPEAT),
      graduated: count(PromotionOutcomeEnum.GRADUATE),
    };
  };
}
