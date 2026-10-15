import { ConflictException, Injectable } from '@nestjs/common';
import { Op } from 'sequelize';
import GradeLevelModel from '@database/models/grade-level.model';
import CrudService from '@database/services/crud.service';
import organizationOf, {
  type OrganizationActor,
} from '@common/utils/organization-of.util';
import GradeLevelRepository from './grade-level.repository';
import CreateGradeLevelDto from './dto/create-grade-level.dto';
import UpdateGradeLevelDto from './dto/update-grade-level.dto';
import STANDARD_GRADE_LEVELS from './constants/standard-grade-levels.constant';
import {
  GRADE_LEVEL_NAME_IN_USE_MESSAGE,
  GRADE_LEVEL_ORDER_IN_USE_MESSAGE,
} from './constants/grade-level-messages.constant';

@Injectable()
export default class GradeLevelsService extends CrudService<
  GradeLevelModel,
  GradeLevelRepository
> {
  constructor(protected readonly repository: GradeLevelRepository) {
    super(repository);
  }

  private assertAvailable = async (
    organizationId: string,
    { name, sequenceOrder }: UpdateGradeLevelDto,
    exceptGradeLevelId?: string,
  ) => {
    const candidates = [
      ...(name ? [{ name }] : []),
      ...(sequenceOrder !== undefined ? [{ sequenceOrder }] : []),
    ];
    if (!candidates.length) return;

    const existing = await this.findOne(
      {
        organizationId,
        [Op.or]: candidates,
        ...(exceptGradeLevelId && { id: { [Op.ne]: exceptGradeLevelId } }),
      },
      false,
      { attributes: ['id', 'name', 'sequenceOrder'] },
    );
    if (!existing) return;

    throw new ConflictException(
      name && existing.name === name
        ? GRADE_LEVEL_NAME_IN_USE_MESSAGE
        : GRADE_LEVEL_ORDER_IN_USE_MESSAGE(existing.name),
    );
  };

  // En orden de promoción.
  public listGradeLevels = async (actor: OrganizationActor) =>
    await this.findAll(
      { organizationId: organizationOf(actor) },
      { order: [['sequenceOrder', 'ASC']] },
    );

  public createGradeLevel = async (
    actor: OrganizationActor,
    dto: CreateGradeLevelDto,
  ) => {
    const organizationId = organizationOf(actor);
    await this.assertAvailable(organizationId, dto);

    return await this.create({ ...dto, organizationId });
  };

  // Un grado de otra organización responde 404, igual que uno inexistente.
  public updateGradeLevel = async (
    actor: OrganizationActor,
    gradeLevelId: string,
    dto: UpdateGradeLevelDto,
  ) => {
    const organizationId = organizationOf(actor);

    await this.findOne({ id: gradeLevelId, organizationId }, true, {
      attributes: ['id'],
    });
    await this.assertAvailable(organizationId, dto, gradeLevelId);

    return await this.updateByPk(gradeLevelId, dto);
  };

  public deleteGradeLevel = async (
    actor: OrganizationActor,
    gradeLevelId: string,
  ) => {
    await this.findOne(
      { id: gradeLevelId, organizationId: organizationOf(actor) },
      true,
      { attributes: ['id'] },
    );
    await this.deleteByPk(gradeLevelId);
  };

  // Crea los grados estándar que falten; no toca los existentes, así que se
  // puede usar sobre un catálogo a medias.
  public loadStandardGradeLevels = async (actor: OrganizationActor) => {
    const organizationId = organizationOf(actor);

    const existing = await this.findAll(
      { organizationId },
      { attributes: ['name', 'sequenceOrder'] },
    );
    const usedNames = new Set(existing.map(({ name }) => name.toLowerCase()));
    const usedOrders = new Set(
      existing.map(({ sequenceOrder }) => sequenceOrder),
    );

    const missing = STANDARD_GRADE_LEVELS.filter(
      ({ name, sequenceOrder }) =>
        !usedNames.has(name.toLowerCase()) && !usedOrders.has(sequenceOrder),
    );

    if (missing.length)
      await this.transaction((transaction) =>
        this.insertMany(
          missing.map((gradeLevel) => ({ ...gradeLevel, organizationId })),
          { transaction },
        ),
      );

    return {
      created: missing.length,
      skipped: STANDARD_GRADE_LEVELS.length - missing.length,
    };
  };
}
