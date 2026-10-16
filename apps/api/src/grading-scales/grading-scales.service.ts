import { BadRequestException, Injectable } from '@nestjs/common';
import GradingScaleModel from '@database/models/grading-scale.model';
import CrudService from '@database/services/crud.service';
import organizationOf, {
  type OrganizationActor,
} from '@common/utils/organization-of.util';
import GradingScaleRepository from './grading-scale.repository';
import SetGradingScaleDto from './dto/set-grading-scale.dto';
import {
  GRADING_SCALE_DECIMALS_MESSAGE,
  GRADING_SCALE_PASSING_MESSAGE,
  GRADING_SCALE_RANGE_MESSAGE,
} from './constants/grading-scale-messages.constant';

export interface GradingScale {
  minScore: number;
  maxScore: number;
  passingScore: number;
  decimalPlaces: number;
  // Aún no la configuró el admin: se usa la escala colombiana habitual.
  isDefault: boolean;
}

export const DEFAULT_GRADING_SCALE: GradingScale = {
  minScore: 1,
  maxScore: 5,
  passingScore: 3,
  decimalPlaces: 1,
  isDefault: true,
};

const SCALE_ATTRIBUTES = [
  'id',
  'minScore',
  'maxScore',
  'passingScore',
  'decimalPlaces',
];

const hasAtMostDecimals = (value: number, decimalPlaces: number) => {
  const scaled = value * 10 ** decimalPlaces;
  return Math.abs(Math.round(scaled) - scaled) < 1e-6;
};

@Injectable()
export default class GradingScalesService extends CrudService<
  GradingScaleModel,
  GradingScaleRepository
> {
  constructor(protected readonly repository: GradingScaleRepository) {
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

    const { minScore, maxScore, passingScore, decimalPlaces } = scale;
    return {
      minScore,
      maxScore,
      passingScore,
      decimalPlaces,
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
    const values = { minScore, maxScore, passingScore, decimalPlaces };

    const existing = await this.findOne({ organizationId }, false, {
      attributes: ['id'],
    });
    if (existing) await this.updateByPk(existing.id, values);
    else await this.create({ ...values, organizationId });

    return { ...values, isDefault: false };
  };
}
