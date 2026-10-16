import {
  BadRequestException,
  ConflictException,
  Injectable,
} from '@nestjs/common';
import GradingScaleModel from '@database/models/grading-scale.model';
import CrudService from '@database/services/crud.service';
import { hasAtMostDecimals } from '@common/utils/score.util';
import organizationOf, {
  type OrganizationActor,
} from '@common/utils/organization-of.util';
import GradingScaleRepository from './grading-scale.repository';
import StudentGradeRepository from '../gradebooks/repositories/student-grade.repository';
import PeriodSubjectSummaryRepository from '../gradebooks/repositories/period-subject-summary.repository';
import SetGradingScaleDto from './dto/set-grading-scale.dto';
import {
  GRADING_SCALE_DECIMALS_MESSAGE,
  GRADING_SCALE_GRADES_OUTSIDE_MESSAGE,
  GRADING_SCALE_PASSING_MESSAGE,
  GRADING_SCALE_RANGE_MESSAGE,
} from './constants/grading-scale-messages.constant';

export interface GradingScale {
  minScore: number;
  maxScore: number;
  passingScore: number;
  decimalPlaces: number;
  // Con esta cantidad de materias reprobadas se reprueba el año (null: no
  // aplica).
  maxFailedSubjects: number | null;
  // También se reprueba con el promedio general bajo la aprobatoria.
  failByAverage: boolean;
  // Aún no la configuró el admin: se usa la escala colombiana habitual.
  isDefault: boolean;
}

// Por defecto, perder una materia reprueba el año y el promedio no cuenta.
export const DEFAULT_GRADING_SCALE: GradingScale = {
  minScore: 1,
  maxScore: 5,
  passingScore: 3,
  decimalPlaces: 1,
  maxFailedSubjects: 1,
  failByAverage: false,
  isDefault: true,
};

const SCALE_ATTRIBUTES = [
  'id',
  'minScore',
  'maxScore',
  'passingScore',
  'decimalPlaces',
  'maxFailedSubjects',
  'failByAverage',
];

@Injectable()
export default class GradingScalesService extends CrudService<
  GradingScaleModel,
  GradingScaleRepository
> {
  constructor(
    protected readonly repository: GradingScaleRepository,
    private readonly studentGradeRepository: StudentGradeRepository,
    private readonly periodSubjectSummaryRepository: PeriodSubjectSummaryRepository,
  ) {
    super(repository);
  }

  private assertValid = ({
    minScore,
    maxScore,
    passingScore,
    decimalPlaces,
  }: SetGradingScaleDto) => {
    if (minScore >= maxScore)
      throw new BadRequestException(GRADING_SCALE_RANGE_MESSAGE);
    if (passingScore <= minScore || passingScore > maxScore)
      throw new BadRequestException(GRADING_SCALE_PASSING_MESSAGE);
    if (
      ![minScore, maxScore, passingScore].every((value) =>
        hasAtMostDecimals(value, decimalPlaces),
      )
    )
      throw new BadRequestException(
        GRADING_SCALE_DECIMALS_MESSAGE(decimalPlaces),
      );
  };

  // Para otros módulos (promoción, planillas, boletines).
  public findScale = async (organizationId: string): Promise<GradingScale> => {
    const scale = await this.findOne({ organizationId }, false, {
      attributes: SCALE_ATTRIBUTES,
    });
    if (!scale) return DEFAULT_GRADING_SCALE;

    const {
      minScore,
      maxScore,
      passingScore,
      decimalPlaces,
      maxFailedSubjects,
      failByAverage,
    } = scale;
    return {
      minScore,
      maxScore,
      passingScore,
      decimalPlaces,
      maxFailedSubjects,
      failByAverage,
      isDefault: false,
    };
  };

  public getScale = async (actor: OrganizationActor) =>
    await this.findScale(organizationOf(actor));

  // Una sola escala por organización: se crea la primera vez y luego se
  // reemplaza completa.
  public setScale = async (
    actor: OrganizationActor,
    dto: SetGradingScaleDto,
  ): Promise<GradingScale> => {
    const organizationId = organizationOf(actor);
    this.assertValid(dto);

    const { minScore, maxScore, passingScore, decimalPlaces } = dto;
    const range = { minScore, maxScore, passingScore, decimalPlaces };
    const values = {
      ...range,
      maxFailedSubjects: dto.maxFailedSubjects ?? null,
      failByAverage: dto.failByAverage ?? false,
    };

    // Las notas ya registradas deben seguir siendo válidas.
    const outside = await this.studentGradeRepository.findOutsideScale(
      organizationId,
      range,
    );
    if (outside)
      throw new ConflictException(
        GRADING_SCALE_GRADES_OUTSIDE_MESSAGE(outside.score),
      );

    const existing = await this.findOne({ organizationId }, false, {
      attributes: ['id', 'passingScore'],
    });
    await this.transaction(async (transaction) => {
      if (existing) await this.updateByPk(existing.id, values, { transaction });
      else await this.create({ ...values, organizationId }, { transaction });

      if (existing?.passingScore !== passingScore)
        await this.periodSubjectSummaryRepository.refreshPassed(
          organizationId,
          passingScore,
          transaction,
        );
    });

    return { ...values, isDefault: false };
  };
}
