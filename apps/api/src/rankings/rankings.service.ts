import { Injectable, NotFoundException } from '@nestjs/common';
import type AuthContextInterface from '@auth/interfaces/auth-context.interface';
import AcademicPeriodModel from '@database/models/academic-period.model';
import ClassroomModel from '@database/models/classroom.model';
import ClassroomSubjectModel from '@database/models/classroom-subject.model';
import GradeLevelModel from '@database/models/grade-level.model';
import StudentModel from '@database/models/student.model';
import SubjectModel from '@database/models/subject.model';
import UserModel from '@database/models/user.model';
import EnrollmentStatusEnum from '@common/enums/enrollment-status.enum';
import RoleNameEnum from '@common/enums/role-name.enum';
import organizationOf from '@common/utils/organization-of.util';
import { roundScore } from '@common/utils/score.util';
import AcademicPeriodRepository from '../academic-years/repositories/academic-period.repository';
import AcademicYearRepository from '../academic-years/repositories/academic-year.repository';
import ClassroomRepository from '../classrooms/classroom.repository';
import ClassroomSubjectRepository from '../classroom-subjects/classroom-subject.repository';
import EnrollmentRepository from '../enrollments/enrollment.repository';
import PeriodSubjectSummaryRepository from '../gradebooks/repositories/period-subject-summary.repository';
import SubjectRecoveryRepository from '../gradebooks/repositories/subject-recovery.repository';
import GradingScalesService, {
  type GradingScale,
} from '../grading-scales/grading-scales.service';
import GetRankingDto from './dto/get-ranking.dto';
import GetSubjectLeadersDto from './dto/get-subject-leaders.dto';
import GetHonorRollDto from './dto/get-honor-roll.dto';
import rankCandidates, {
  type RankingCandidate,
  rawWeightedAverage,
} from './utils/ranking.util';
import {
  RANKING_CLASSROOM_NOT_FOUND_MESSAGE,
  RANKING_PERIOD_NOT_FOUND_MESSAGE,
} from './constants/ranking-messages.constant';

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
// Retirados y trasladados no compiten.
const RANKED_STATUSES = [
  EnrollmentStatusEnum.IN_PROGRESS,
  EnrollmentStatusEnum.PROMOTED,
  EnrollmentStatusEnum.FAILED,
  EnrollmentStatusEnum.GRADUATED,
];

interface Candidate extends RankingCandidate {
  enrollmentId: string;
  student: StudentModel;
  classroom: { id: string; name: string };
  gradedSubjects: number;
  passedSubjects: number;
  failedSubjects: number;
}

@Injectable()
export default class RankingsService {
  constructor(
    private readonly academicYearRepository: AcademicYearRepository,
    private readonly academicPeriodRepository: AcademicPeriodRepository,
    private readonly classroomRepository: ClassroomRepository,
    private readonly classroomSubjectRepository: ClassroomSubjectRepository,
    private readonly enrollmentRepository: EnrollmentRepository,
    private readonly periodSubjectSummaryRepository: PeriodSubjectSummaryRepository,
    private readonly subjectRecoveryRepository: SubjectRecoveryRepository,
    private readonly gradingScalesService: GradingScalesService,
  ) {}

  private findYear = async (organizationId: string, academicYearId?: string) =>
    await this.academicYearRepository.findOne(
      academicYearId
        ? { id: academicYearId, organizationId }
        : { organizationId, isActive: true },
      !!academicYearId,
      { attributes: ['id', 'name', 'status'] },
    );

  private loadClassrooms = async (
    organizationId: string,
    academicYearId: string,
    filters: { gradeLevelId?: string; classroomId?: string } = {},
  ) => {
    const classrooms = await this.classroomRepository.findAll(
      {
        organizationId,
        academicYearId,
        ...(filters.gradeLevelId && { gradeLevelId: filters.gradeLevelId }),
        ...(filters.classroomId && { id: filters.classroomId }),
      },
      {
        attributes: ['id', 'name', 'gradeLevelId', 'homeroomTeacherId'],
        include: [
          {
            model: GradeLevelModel,
            attributes: ['id', 'name', 'sequenceOrder'],
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
    const assignments = classrooms.length
      ? await this.classroomSubjectRepository.findAll(
          { classroomId: classrooms.map(({ id }) => id) },
          {
            attributes: [
              'id',
              'classroomId',
              'subjectId',
              'teacherId',
              'weightInGpa',
            ],
            include: [
              { model: SubjectModel, attributes: ['id', 'name'] },
              {
                model: UserModel,
                as: 'teacher',
                attributes: ['id', 'firstName', 'lastName'],
              },
            ],
            order: [[{ model: SubjectModel, as: 'subject' }, 'name', 'ASC']],
          },
        )
      : [];
    return { classrooms, assignments };
  };

  // El profesor ve el ranking general de los salones que dirige y el de las
  // materias que dicta (o de las de su dirección de grupo).
  private accessFor = (actor: Actor, assignments: ClassroomSubjectModel[]) => {
    const isTeacher = actor.roleName === RoleNameEnum.TEACHER;
    const directs = (classroom: ClassroomModel) =>
      !isTeacher || classroom.homeroomTeacherId === actor.userId;
    return {
      general: directs,
      subject: (classroom: ClassroomModel, subjectId: string) =>
        assignments.some(
          (assignment) =>
            assignment.classroomId === classroom.id &&
            assignment.subjectId === subjectId &&
            (directs(classroom) || assignment.teacherId === actor.userId),
        ),
    };
  };

  // Salones, materias y periodos con los que el actor puede armar rankings.
  public getOptions = async (actor: Actor, academicYearId?: string) => {
    const organizationId = organizationOf(actor);
    const academicYear = await this.findYear(organizationId, academicYearId);
    if (!academicYear)
      return { academicYear: null, periods: [], classrooms: [], subjects: [] };

    const [periods, { classrooms, assignments }] = await Promise.all([
      this.academicPeriodRepository.findAll(
        { academicYearId: academicYear.id },
        {
          attributes: ['id', 'name', 'orderIndex', 'weightPercentage'],
          order: [['orderIndex', 'ASC']],
        },
      ),
      this.loadClassrooms(organizationId, academicYear.id),
    ]);
    const access = this.accessFor(actor, assignments);

    const visible = classrooms.flatMap((classroom) => {
      const subjectIds = assignments
        .filter(
          ({ classroomId, subjectId }) =>
            classroomId === classroom.id &&
            access.subject(classroom, subjectId),
        )
        .map(({ subjectId }) => subjectId);
      const general = access.general(classroom);
      return general || subjectIds.length
        ? [
            {
              id: classroom.id,
              name: classroom.name,
              gradeLevel: classroom.gradeLevel ?? null,
              general,
              subjectIds,
            },
          ]
        : [];
    });
    const subjects = new Map(
      assignments
        .filter(({ classroomId, subjectId }) =>
          visible.some(
            ({ id, subjectIds }) =>
              id === classroomId && subjectIds.includes(subjectId),
          ),
        )
        .map(({ subject }) => [subject!.id, subject!]),
    );

    return {
      academicYear,
      periods,
      classrooms: visible,
      subjects: [...subjects.values()].sort((a, b) =>
        a.name.localeCompare(b.name, 'es'),
      ),
    };
  };

  // Notas sin redondear de las matrículas de los salones y candidatos al
  // ranking general (sin materia) o de una materia.
  private loadScores = async (
    academicYearId: string,
    period: Pick<AcademicPeriodModel, 'id'> | null,
    ranked: ClassroomModel[],
    assignments: ClassroomSubjectModel[],
    scale: GradingScale,
  ) => {
    const rankedIds = new Set(ranked.map(({ id }) => id));
    const subjectsOf = (classroomId: string) =>
      assignments.filter(
        (assignment) => assignment.classroomId === classroomId,
      );
    const assignmentIds = assignments
      .filter(({ classroomId }) => rankedIds.has(classroomId))
      .map(({ id }) => id);

    const enrollments = await this.enrollmentRepository.findAll(
      { classroomId: [...rankedIds], status: RANKED_STATUSES },
      {
        attributes: ['id', 'classroomId', 'status'],
        include: [{ model: StudentModel, attributes: STUDENT_ATTRIBUTES }],
      },
    );
    const enrollmentIds = enrollments.map(({ id }) => id);
    const scoped = {
      classroomSubjectId: assignmentIds,
      enrollmentId: enrollmentIds,
    };

    const [summaries, periods, recoveries] =
      enrollmentIds.length && assignmentIds.length
        ? await Promise.all([
            this.periodSubjectSummaryRepository.findAll(
              { ...scoped, ...(period && { academicPeriodId: period.id }) },
              {
                attributes: [
                  'enrollmentId',
                  'classroomSubjectId',
                  'academicPeriodId',
                  'finalPeriodScore',
                ],
              },
            ),
            period
              ? []
              : this.academicPeriodRepository.findAll(
                  { academicYearId: academicYearId },
                  { attributes: ['id', 'weightPercentage'] },
                ),
            period
              ? []
              : this.subjectRecoveryRepository.findAll(scoped, {
                  attributes: ['enrollmentId', 'classroomSubjectId', 'score'],
                }),
          ])
        : [[], [], []];

    const periodScore = new Map(
      summaries.map((summary) => [
        `${summary.enrollmentId}:${summary.classroomSubjectId}:${summary.academicPeriodId}`,
        summary.finalPeriodScore,
      ]),
    );
    const recoveryScore = new Map(
      recoveries.map(({ enrollmentId, classroomSubjectId, score }) => [
        `${enrollmentId}:${classroomSubjectId}`,
        score,
      ]),
    );
    // Nota sin redondear de la matrícula en la materia: la definitiva del
    // periodo o el acumulado anual (la recuperación lo reemplaza).
    const scoreOf = (enrollmentId: string, classroomSubjectId: string) => {
      if (period)
        return (
          periodScore.get(
            `${enrollmentId}:${classroomSubjectId}:${period.id}`,
          ) ?? null
        );
      const recovered = recoveryScore.get(
        `${enrollmentId}:${classroomSubjectId}`,
      );
      if (recovered !== undefined) return recovered;
      return rawWeightedAverage(
        periods.flatMap(({ id, weightPercentage }) => {
          const score = periodScore.get(
            `${enrollmentId}:${classroomSubjectId}:${id}`,
          );
          return score === null || score === undefined
            ? []
            : [{ score, weight: weightPercentage }];
        }),
      );
    };
    const passes = (score: number) =>
      roundScore(score, scale.decimalPlaces) >= scale.passingScore;

    const candidatesFor = (subjectId?: string): Candidate[] =>
      enrollments.flatMap(({ id, classroomId, student }) => {
        const graded = subjectsOf(classroomId).flatMap((assignment) => {
          const score = scoreOf(id, assignment.id);
          return score === null ? [] : [{ assignment, score }];
        });
        const failedSubjects = graded.filter(
          ({ score }) => !passes(score),
        ).length;
        const score = subjectId
          ? (graded.find(({ assignment }) => assignment.subjectId === subjectId)
              ?.score ?? null)
          : rawWeightedAverage(
              graded.map(({ assignment, score: value }) => ({
                score: value,
                weight: assignment.weightInGpa,
              })),
            );
        if (score === null) return [];

        const classroom = ranked.find((item) => item.id === classroomId)!;
        return [
          {
            enrollmentId: id,
            student: student!,
            firstName: student!.firstName,
            lastName: student!.lastName,
            classroom: { id: classroom.id, name: classroom.name },
            score,
            allPassed: subjectId ? passes(score) : failedSubjects === 0,
            gradedSubjects: graded.length,
            passedSubjects: graded.length - failedSubjects,
            failedSubjects,
          },
        ];
      });

    return { candidatesFor };
  };

  private toRows = (
    candidates: Candidate[],
    { subjectId, limit }: { subjectId?: string; limit?: number },
    scale: GradingScale,
  ) =>
    rankCandidates(candidates, { prioritizeAllPassed: !subjectId })
      .filter(({ position }) => !limit || position <= limit)
      .map((row) => ({
        position: row.position,
        enrollmentId: row.enrollmentId,
        student: row.student,
        classroom: row.classroom,
        score: roundScore(row.score, scale.decimalPlaces),
        gradedSubjects: row.gradedSubjects,
        passedSubjects: row.passedSubjects,
        failedSubjects: row.failedSubjects,
      }));

  private findPeriod = async (academicYearId: string, periodId?: string) => {
    if (!periodId) return null;
    const period = await this.academicPeriodRepository.findOne(
      { id: periodId, academicYearId },
      false,
      { attributes: ['id', 'name', 'orderIndex', 'weightPercentage'] },
    );
    if (!period) throw new NotFoundException(RANKING_PERIOD_NOT_FOUND_MESSAGE);
    return period;
  };

  // Ranking de un salón, un grado o todo el año, general o por materia, de un
  // periodo o del acumulado anual.
  public getRanking = async (actor: Actor, dto: GetRankingDto) => {
    const organizationId = organizationOf(actor);
    const [academicYear, scale] = await Promise.all([
      this.findYear(organizationId, dto.academicYearId),
      this.gradingScalesService.findScale(organizationId),
    ]);
    const empty = {
      academicYear,
      period: null,
      scale,
      scope: { classroom: null, gradeLevel: null, subject: null },
      total: 0,
      rows: [],
    };
    if (!academicYear) return empty;

    const period = await this.findPeriod(academicYear.id, dto.periodId);

    const { classrooms, assignments } = await this.loadClassrooms(
      organizationId,
      academicYear.id,
      dto,
    );
    const access = this.accessFor(actor, assignments);
    const { subjectId } = dto;
    const ranked = classrooms.filter((classroom) =>
      subjectId
        ? access.subject(classroom, subjectId)
        : access.general(classroom),
    );
    if (dto.classroomId && !ranked.length)
      throw new NotFoundException(RANKING_CLASSROOM_NOT_FOUND_MESSAGE);

    const scope = {
      classroom: dto.classroomId
        ? { id: ranked[0].id, name: ranked[0].name }
        : null,
      gradeLevel: dto.gradeLevelId ? (classrooms[0]?.gradeLevel ?? null) : null,
      subject: subjectId
        ? (assignments.find((assignment) => assignment.subjectId === subjectId)
            ?.subject ?? null)
        : null,
    };
    if (!ranked.length) return { ...empty, period, scope };

    const { candidatesFor } = await this.loadScores(
      academicYear.id,
      period,
      ranked,
      assignments,
      scale,
    );
    const candidates = candidatesFor(subjectId);

    const eligible = dto.onlyAllPassed
      ? candidates.filter(({ allPassed }) => allPassed)
      : candidates;
    const rows = this.toRows(eligible, { subjectId, limit: dto.limit }, scale);

    return { academicYear, period, scale, scope, total: eligible.length, rows };
  };

  // Mejor estudiante de cada materia de un salón (los empatados en el primer
  // puesto aparecen juntos).
  public getSubjectLeaders = async (
    actor: Actor,
    { academicYearId, classroomId, periodId }: GetSubjectLeadersDto,
  ) => {
    const organizationId = organizationOf(actor);
    const [academicYear, scale] = await Promise.all([
      this.findYear(organizationId, academicYearId),
      this.gradingScalesService.findScale(organizationId),
    ]);
    if (!academicYear)
      throw new NotFoundException(RANKING_CLASSROOM_NOT_FOUND_MESSAGE);

    const period = await this.findPeriod(academicYear.id, periodId);
    const { classrooms, assignments } = await this.loadClassrooms(
      organizationId,
      academicYear.id,
      { classroomId },
    );
    const classroom = classrooms[0];
    const access = this.accessFor(actor, assignments);
    const visible = classroom
      ? assignments.filter(({ subjectId }) =>
          access.subject(classroom, subjectId),
        )
      : [];
    if (!visible.length)
      throw new NotFoundException(RANKING_CLASSROOM_NOT_FOUND_MESSAGE);

    const { candidatesFor } = await this.loadScores(
      academicYear.id,
      period,
      [classroom],
      assignments,
      scale,
    );

    return {
      academicYear,
      period,
      scale,
      classroom: { id: classroom.id, name: classroom.name },
      subjects: visible.map(({ subjectId, subject, teacher }) => {
        const candidates = candidatesFor(subjectId);
        return {
          subject: subject!,
          teacher: teacher ?? null,
          graded: candidates.length,
          leaders: this.toRows(candidates, { subjectId, limit: 1 }, scale),
        };
      }),
    };
  };

  // Cuadro de honor: los primeros puestos del promedio general de cada salón
  // (o de cada grado, con todos sus salones juntos).
  public getHonorRoll = async (actor: Actor, dto: GetHonorRollDto) => {
    const organizationId = organizationOf(actor);
    const [academicYear, scale] = await Promise.all([
      this.findYear(organizationId, dto.academicYearId),
      this.gradingScalesService.findScale(organizationId),
    ]);
    if (!academicYear)
      return { academicYear: null, period: null, scale, groups: [] };

    const period = await this.findPeriod(academicYear.id, dto.periodId);
    const { classrooms, assignments } = await this.loadClassrooms(
      organizationId,
      academicYear.id,
    );
    const access = this.accessFor(actor, assignments);
    const ranked = classrooms.filter((classroom) => access.general(classroom));
    if (!ranked.length) return { academicYear, period, scale, groups: [] };

    const { candidatesFor } = await this.loadScores(
      academicYear.id,
      period,
      ranked,
      assignments,
      scale,
    );
    const candidates = candidatesFor().filter(
      ({ allPassed }) => !dto.onlyAllPassed || allPassed,
    );

    const byGrade = dto.groupBy === 'gradeLevel';
    const groups = new Map<
      string,
      { id: string; name: string; classroomIds: string[] }
    >();
    for (const classroom of ranked) {
      const key = byGrade ? classroom.gradeLevelId : classroom.id;
      const group = groups.get(key) ?? {
        id: key,
        name: byGrade
          ? (classroom.gradeLevel?.name ?? classroom.name)
          : classroom.name,
        classroomIds: [],
      };
      group.classroomIds.push(classroom.id);
      groups.set(key, group);
    }

    return {
      academicYear,
      period,
      scale,
      groups: [...groups.values()].map(({ id, name, classroomIds }) => {
        const members = candidates.filter(({ classroom }) =>
          classroomIds.includes(classroom.id),
        );
        return {
          id,
          name,
          gradeLevel: byGrade
            ? null
            : (ranked.find((classroom) => classroom.id === id)?.gradeLevel ??
              null),
          total: members.length,
          rows: this.toRows(members, { limit: dto.limit }, scale),
        };
      }),
    };
  };

  // Puesto de una matrícula en el ranking general de su salón (acumulado del
  // año). Lo usa el boletín.
  public classroomPosition = async (
    organizationId: string,
    enrollment: { id: string; classroomId: string; academicYearId: string },
  ) => {
    const scale = await this.gradingScalesService.findScale(organizationId);
    const { classrooms, assignments } = await this.loadClassrooms(
      organizationId,
      enrollment.academicYearId,
      { classroomId: enrollment.classroomId },
    );
    if (!classrooms.length) return null;

    const { candidatesFor } = await this.loadScores(
      enrollment.academicYearId,
      null,
      classrooms,
      assignments,
      scale,
    );
    const candidates = candidatesFor();
    const row = rankCandidates(candidates, { prioritizeAllPassed: true }).find(
      ({ enrollmentId }) => enrollmentId === enrollment.id,
    );
    return row ? { position: row.position, total: candidates.length } : null;
  };
}
