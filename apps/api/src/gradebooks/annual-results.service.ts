import { Injectable } from '@nestjs/common';
import SubjectModel from '@database/models/subject.model';
import UserModel from '@database/models/user.model';
import AcademicPeriodRepository from '../academic-years/repositories/academic-period.repository';
import ClassroomSubjectRepository from '../classroom-subjects/classroom-subject.repository';
import type { GradingScale } from '../grading-scales/grading-scales.service';
import PeriodSubjectSummaryRepository from './repositories/period-subject-summary.repository';
import annualResults from './utils/annual-results.util';

// Resultados anuales de las matrículas de un salón a partir de las
// definitivas de cada periodo. Lo usan el boletín y la promoción.
@Injectable()
export default class AnnualResultsService {
  constructor(
    private readonly academicPeriodRepository: AcademicPeriodRepository,
    private readonly classroomSubjectRepository: ClassroomSubjectRepository,
    private readonly periodSubjectSummaryRepository: PeriodSubjectSummaryRepository,
  ) {}

  public loadClassroom = async (
    classroom: { id: string; academicYearId: string },
    enrollmentIds: string[],
    scale: GradingScale,
  ) => {
    const [periods, assignments] = await Promise.all([
      this.academicPeriodRepository.findAll(
        { academicYearId: classroom.academicYearId },
        {
          attributes: ['id', 'name', 'orderIndex', 'weightPercentage'],
          order: [['orderIndex', 'ASC']],
        },
      ),
      this.classroomSubjectRepository.findAll(
        { classroomId: classroom.id },
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
    ]);

    const summaries =
      enrollmentIds.length && assignments.length
        ? await this.periodSubjectSummaryRepository.findAll(
            {
              enrollmentId: enrollmentIds,
              classroomSubjectId: assignments.map(({ id }) => id),
            },
            {
              attributes: [
                'enrollmentId',
                'classroomSubjectId',
                'academicPeriodId',
                'finalPeriodScore',
                'teacherObservation',
              ],
            },
          )
        : [];
    const resultOf = new Map(
      summaries.map((summary) => [
        `${summary.enrollmentId}:${summary.classroomSubjectId}:${summary.academicPeriodId}`,
        {
          score: summary.finalPeriodScore,
          observation: summary.teacherObservation,
        },
      ]),
    );

    const subjects = assignments.map(
      ({ id, weightInGpa, subject, teacher }) => ({
        id,
        weightInGpa,
        subject: subject!,
        teacher: teacher
          ? { firstName: teacher.firstName, lastName: teacher.lastName }
          : null,
      }),
    );

    return {
      periods,
      subjects,
      resultsFor: (enrollmentId: string) =>
        annualResults(
          periods,
          subjects,
          (subjectId, periodId) =>
            resultOf.get(`${enrollmentId}:${subjectId}:${periodId}`),
          scale,
        ),
    };
  };
}
