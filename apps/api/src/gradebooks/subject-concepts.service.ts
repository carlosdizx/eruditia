import {
  BadRequestException,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import type AuthContextInterface from '@auth/interfaces/auth-context.interface';
import AcademicYearModel from '@database/models/academic-year.model';
import ClassroomModel from '@database/models/classroom.model';
import GradeLevelModel from '@database/models/grade-level.model';
import RoleNameEnum from '@common/enums/role-name.enum';
import { hasAtMostDecimals } from '@common/utils/score.util';
import AcademicPeriodRepository from '../academic-years/repositories/academic-period.repository';
import ClassroomSubjectRepository from '../classroom-subjects/classroom-subject.repository';
import GradingScalesService from '../grading-scales/grading-scales.service';
import GradebooksService from './gradebooks.service';
import SubjectPeriodConceptRepository from './repositories/subject-period-concept.repository';
import { findOverlap } from './utils/concept.util';
import SetSubjectConceptsDto from './dto/set-subject-concepts.dto';
import {
  CONCEPT_RANGE_DECIMALS_MESSAGE,
  CONCEPT_RANGE_ORDER_MESSAGE,
  CONCEPT_RANGE_OVERLAP_MESSAGE,
  CONCEPT_RANGE_SCALE_MESSAGE,
  GRADEBOOK_READ_ONLY_MESSAGE,
} from './constants/gradebook-messages.constant';

type Actor = Pick<
  AuthContextInterface,
  'organizationId' | 'userId' | 'roleName'
>;

// Conceptos evaluativos por rango: el profesor redacta un texto para cada
// tramo de notas de su materia en un periodo y el boletín imprime el que
// corresponda a la definitiva de cada estudiante.
@Injectable()
export default class SubjectConceptsService {
  constructor(
    private readonly gradebooksService: GradebooksService,
    private readonly classroomSubjectRepository: ClassroomSubjectRepository,
    private readonly academicPeriodRepository: AcademicPeriodRepository,
    private readonly subjectPeriodConceptRepository: SubjectPeriodConceptRepository,
    private readonly gradingScalesService: GradingScalesService,
  ) {}

  // Reemplaza los rangos del periodo. Mismas reglas de bloqueo que las notas:
  // el profesor solo en periodos abiertos, nadie con el año cerrado.
  public setConcepts = async (
    actor: Actor,
    classroomSubjectId: string,
    periodId: string,
    { concepts }: SetSubjectConceptsDto,
  ) => {
    const context = await this.gradebooksService.loadContext(
      actor,
      classroomSubjectId,
    );
    const period = this.gradebooksService.findPeriod(context.periods, periodId);
    this.gradebooksService.assertEditable(context, period);

    const scale = await this.gradingScalesService.findScale(
      context.organizationId,
    );
    const format = (value: number) => value.toFixed(scale.decimalPlaces);
    const range = ({ minScore, maxScore }: (typeof concepts)[number]) =>
      `${format(minScore)}–${format(maxScore)}`;

    for (const { minScore, maxScore } of concepts) {
      if (minScore > maxScore)
        throw new BadRequestException(
          CONCEPT_RANGE_ORDER_MESSAGE(format(minScore), format(maxScore)),
        );
      if (minScore < scale.minScore || maxScore > scale.maxScore)
        throw new BadRequestException(
          CONCEPT_RANGE_SCALE_MESSAGE(
            format(scale.minScore),
            format(scale.maxScore),
          ),
        );
      if (
        !hasAtMostDecimals(minScore, scale.decimalPlaces) ||
        !hasAtMostDecimals(maxScore, scale.decimalPlaces)
      )
        throw new BadRequestException(
          CONCEPT_RANGE_DECIMALS_MESSAGE(scale.decimalPlaces),
        );
    }
    const overlap = findOverlap(concepts);
    if (overlap)
      throw new BadRequestException(
        CONCEPT_RANGE_OVERLAP_MESSAGE(range(overlap[0]), range(overlap[1])),
      );

    await this.subjectPeriodConceptRepository.transaction(
      async (transaction) => {
        await this.subjectPeriodConceptRepository.deleteAllOf(
          context.assignment.id,
          period.id,
          transaction,
        );
        await this.subjectPeriodConceptRepository.insertMany(
          concepts.map(({ minScore, maxScore, conceptText }) => ({
            minScore,
            maxScore,
            conceptText: conceptText.trim(),
            organizationId: context.organizationId,
            classroomSubjectId: context.assignment.id,
            academicPeriodId: period.id,
            updatedBy: actor.userId,
          })),
          { transaction },
        );
      },
    );

    return await this.gradebooksService.listConcepts(
      context.assignment.id,
      period.id,
    );
  };

  // Rangos ya configurados que se pueden copiar: los otros periodos de esta
  // materia y los de la misma materia en otros salones (del profesor que
  // consulta, o de todos si es admin), de cualquier año.
  public listSources = async (actor: Actor, classroomSubjectId: string) => {
    const context = await this.gradebooksService.loadContext(
      actor,
      classroomSubjectId,
    );
    if (!context.canManage)
      throw new ForbiddenException(GRADEBOOK_READ_ONLY_MESSAGE);

    const assignments = await this.classroomSubjectRepository.findAll(
      {
        organizationId: context.organizationId,
        subjectId: context.assignment.subjectId,
        ...(actor.roleName === RoleNameEnum.TEACHER && {
          teacherId: actor.userId,
        }),
      },
      {
        attributes: ['id', 'classroomId'],
        include: [
          {
            model: ClassroomModel,
            attributes: ['id', 'name'],
            include: [
              { model: GradeLevelModel, attributes: ['id', 'name'] },
              { model: AcademicYearModel, attributes: ['id', 'name'] },
            ],
          },
        ],
      },
    );

    const concepts = await this.subjectPeriodConceptRepository.findAll(
      { classroomSubjectId: assignments.map(({ id }) => id) },
      {
        attributes: [
          'classroomSubjectId',
          'academicPeriodId',
          'minScore',
          'maxScore',
          'conceptText',
        ],
        order: [['minScore', 'ASC']],
      },
    );
    if (!concepts.length) return [];

    const periods = await this.academicPeriodRepository.findAll(
      { id: [...new Set(concepts.map((c) => c.academicPeriodId))] },
      { attributes: ['id', 'name', 'orderIndex'] },
    );
    const periodOf = new Map(periods.map((period) => [period.id, period]));

    return assignments
      .flatMap(({ id, classroom }) => {
        const own = concepts.filter((c) => c.classroomSubjectId === id);
        if (!own.length || !classroom) return [];
        const periodIds = [...new Set(own.map((c) => c.academicPeriodId))];
        return [
          {
            classroomSubjectId: id,
            current: id === context.assignment.id,
            classroom: {
              id: classroom.id,
              name: classroom.name,
              gradeLevel: classroom.gradeLevel ?? null,
            },
            academicYear: classroom.academicYear ?? null,
            periods: periodIds
              .flatMap((periodId) => {
                const period = periodOf.get(periodId);
                return period ? [period] : [];
              })
              .sort((a, b) => a.orderIndex - b.orderIndex)
              .map(({ id: periodId, name, orderIndex }) => ({
                id: periodId,
                name,
                orderIndex,
                concepts: own
                  .filter((c) => c.academicPeriodId === periodId)
                  .map(({ minScore, maxScore, conceptText }) => ({
                    minScore,
                    maxScore,
                    conceptText,
                  })),
              })),
          },
        ];
      })
      .sort(
        (a, b) =>
          Number(b.current) - Number(a.current) ||
          (b.academicYear?.name ?? '').localeCompare(
            a.academicYear?.name ?? '',
          ) ||
          a.classroom.name.localeCompare(b.classroom.name),
      );
  };
}
