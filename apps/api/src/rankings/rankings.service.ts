import { Injectable, NotFoundException } from '@nestjs/common';
import type AuthContextInterface from '@auth/interfaces/auth-context.interface';
import ClassroomModel from '@database/models/classroom.model';
import ClassroomSubjectModel from '@database/models/classroom-subject.model';
import GradeLevelModel from '@database/models/grade-level.model';
import StudentModel from '@database/models/student.model';
import SubjectModel from '@database/models/subject.model';
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
import GradingScalesService from '../grading-scales/grading-scales.service';
import GetRankingDto from './dto/get-ranking.dto';
import rankCandidates, { rawWeightedAverage } from './utils/ranking.util';
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
            include: [{ model: SubjectModel, attributes: ['id', 'name'] }],
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

    const period = dto.periodId
      ? await this.academicPeriodRepository.findOne(
          { id: dto.periodId, academicYearId: academicYear.id },
          false,
          { attributes: ['id', 'name', 'orderIndex', 'weightPercentage'] },
        )
      : null;
    if (dto.periodId && !period)
      throw new NotFoundException(RANKING_PERIOD_NOT_FOUND_MESSAGE);

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
                  { academicYearId: academicYear.id },
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

    const candidates = enrollments.flatMap(({ id, classroomId, student }) => {
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

    const eligible = dto.onlyAllPassed
      ? candidates.filter(({ allPassed }) => allPassed)
      : candidates;
    const rows = rankCandidates(eligible, {
      prioritizeAllPassed: !subjectId,
    })
      .filter(({ position }) => !dto.limit || position <= dto.limit)
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

    return { academicYear, period, scale, scope, total: eligible.length, rows };
  };
}
