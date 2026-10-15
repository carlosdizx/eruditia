import {
  BadRequestException,
  ConflictException,
  Injectable,
} from '@nestjs/common';
import { Op, OrderItem, Transaction } from 'sequelize';
import AcademicYearModel from '@database/models/academic-year.model';
import AcademicPeriodModel from '@database/models/academic-period.model';
import CrudService from '@database/services/crud.service';
import AcademicYearStatusEnum from '@common/enums/academic-year-status.enum';
import organizationOf, {
  type OrganizationActor,
} from '@common/utils/organization-of.util';
import AcademicYearRepository from './repositories/academic-year.repository';
import AcademicPeriodRepository from './repositories/academic-period.repository';
import CreateAcademicYearDto from './dto/create-academic-year.dto';
import UpdateAcademicYearDto from './dto/update-academic-year.dto';
import SetAcademicPeriodsDto from './dto/set-academic-periods.dto';
import UpdateAcademicPeriodDto from './dto/update-academic-period.dto';
import AcademicPeriodDto from './dto/academic-period.dto';
import {
  ACTIVE_YEAR_DELETE_MESSAGE,
  ACADEMIC_YEAR_NAME_IN_USE_MESSAGE,
  CLOSED_YEAR_MESSAGE,
  INVALID_DATE_RANGE_MESSAGE,
  PERIOD_NOT_IN_YEAR_MESSAGE,
  PERIODS_SUM_MESSAGE,
} from './constants/academic-year-messages.constant';

const PERIODS_INCLUDE = [{ model: AcademicPeriodModel, as: 'periods' }];

// Años más recientes primero; sus periodos en orden.
const YEAR_ORDER: OrderItem[] = [
  ['startDate', 'DESC'],
  [{ model: AcademicPeriodModel, as: 'periods' }, 'orderIndex', 'ASC'],
];

// En centésimas para no arrastrar errores de punto flotante (33.33 * 3).
const assertWeightsSumHundred = (periods: AcademicPeriodDto[]) => {
  const cents = periods.reduce(
    (sum, { weightPercentage }) => sum + Math.round(weightPercentage * 100),
    0,
  );
  if (cents !== 100_00)
    throw new BadRequestException(PERIODS_SUM_MESSAGE(cents / 100));
};

const assertDateRange = (startDate: string, endDate: string) => {
  if (endDate <= startDate)
    throw new BadRequestException(INVALID_DATE_RANGE_MESSAGE);
};

@Injectable()
export default class AcademicYearsService extends CrudService<
  AcademicYearModel,
  AcademicYearRepository
> {
  constructor(
    protected readonly repository: AcademicYearRepository,
    private readonly periodRepository: AcademicPeriodRepository,
  ) {
    super(repository);
  }

  // Un año de otra organización responde 404, igual que uno inexistente.
  private findOwnYear = async (actor: OrganizationActor, yearId: string) =>
    (await this.findOne(
      { id: yearId, organizationId: organizationOf(actor) },
      true,
      {
        attributes: [
          'id',
          'organizationId',
          'startDate',
          'endDate',
          'isActive',
          'status',
        ],
      },
    ))!;

  private assertNameAvailable = async (
    organizationId: string,
    name: string,
    exceptYearId?: string,
  ) => {
    const existing = await this.findOne(
      {
        organizationId,
        name,
        ...(exceptYearId && { id: { [Op.ne]: exceptYearId } }),
      },
      false,
      { attributes: ['id'] },
    );
    if (existing)
      throw new ConflictException(ACADEMIC_YEAR_NAME_IN_USE_MESSAGE);
  };

  private createPeriods = (
    { id: academicYearId, organizationId }: AcademicYearModel,
    periods: { period: AcademicPeriodDto; orderIndex: number }[],
    transaction: Transaction,
  ) =>
    this.periodRepository.insertMany(
      periods.map(({ period: { name, weightPercentage }, orderIndex }) => ({
        organizationId,
        academicYearId,
        name,
        weightPercentage,
        orderIndex,
      })),
      { transaction },
    );

  public listAcademicYears = async (actor: OrganizationActor) =>
    await this.findAll(
      { organizationId: organizationOf(actor) },
      { include: PERIODS_INCLUDE, order: YEAR_ORDER },
    );

  public findAcademicYear = async (actor: OrganizationActor, yearId: string) =>
    (await this.findOne(
      { id: yearId, organizationId: organizationOf(actor) },
      true,
      { include: PERIODS_INCLUDE, order: YEAR_ORDER },
    ))!;

  // El primer año de la organización queda activo.
  public createAcademicYear = async (
    actor: OrganizationActor,
    { periods, ...dto }: CreateAcademicYearDto,
  ) => {
    const organizationId = organizationOf(actor);

    assertDateRange(dto.startDate, dto.endDate);
    assertWeightsSumHundred(periods);
    await this.assertNameAvailable(organizationId, dto.name);

    const active = await this.findOne(
      { organizationId, isActive: true },
      false,
      { attributes: ['id'] },
    );

    const year = await this.transaction(async (transaction) => {
      const created = await this.create(
        { ...dto, organizationId, isActive: !active },
        { transaction },
      );
      await this.createPeriods(
        created,
        periods.map((period, index) => ({ period, orderIndex: index + 1 })),
        transaction,
      );
      return created;
    });

    return await this.findAcademicYear(actor, year.id);
  };

  public updateAcademicYear = async (
    actor: OrganizationActor,
    yearId: string,
    dto: UpdateAcademicYearDto,
  ) => {
    const year = await this.findOwnYear(actor, yearId);

    if (dto.name)
      await this.assertNameAvailable(year.organizationId, dto.name, year.id);
    assertDateRange(
      dto.startDate ?? year.startDate,
      dto.endDate ?? year.endDate,
    );

    await this.transaction(async (transaction) => {
      await this.updateByPk(year.id, dto, { transaction });
      if (dto.status === AcademicYearStatusEnum.CLOSED)
        await this.periodRepository.closeGradingOfYear(year.id, transaction);
    });

    return await this.findAcademicYear(actor, year.id);
  };

  // Reemplaza la lista: actualiza los que traen id, crea los nuevos y elimina
  // los que ya no están.
  public setAcademicPeriods = async (
    actor: OrganizationActor,
    yearId: string,
    { periods }: SetAcademicPeriodsDto,
  ) => {
    const year = await this.findOwnYear(actor, yearId);
    if (year.status === AcademicYearStatusEnum.CLOSED)
      throw new ConflictException(CLOSED_YEAR_MESSAGE);

    assertWeightsSumHundred(periods);

    const existing = await this.periodRepository.findAll(
      { academicYearId: year.id },
      { attributes: ['id'] },
    );
    const existingIds = new Set(existing.map(({ id }) => id));
    const keepIds = periods.flatMap(({ id }) => (id ? [id] : []));

    if (keepIds.some((id) => !existingIds.has(id)))
      throw new BadRequestException(PERIOD_NOT_IN_YEAR_MESSAGE);

    const ordered = periods.map((period, index) => ({
      period,
      orderIndex: index + 1,
    }));

    await this.transaction(async (transaction) => {
      await this.periodRepository.deleteOthers(year.id, keepIds, transaction);

      for (const { period, orderIndex } of ordered.filter(
        ({ period }) => period.id,
      ))
        await this.periodRepository.updateByPk(
          period.id!,
          {
            name: period.name,
            weightPercentage: period.weightPercentage,
            orderIndex,
          },
          { transaction },
        );

      await this.createPeriods(
        year,
        ordered.filter(({ period }) => !period.id),
        transaction,
      );
    });

    return await this.findAcademicYear(actor, year.id);
  };

  // Abrir o cerrar el ingreso de notas de un periodo.
  public updateAcademicPeriod = async (
    actor: OrganizationActor,
    yearId: string,
    periodId: string,
    { isOpenForGrading }: UpdateAcademicPeriodDto,
  ) => {
    const year = await this.findOwnYear(actor, yearId);
    if (isOpenForGrading && year.status === AcademicYearStatusEnum.CLOSED)
      throw new ConflictException(CLOSED_YEAR_MESSAGE);

    const period = (await this.periodRepository.findOne(
      { id: periodId, academicYearId: year.id },
      true,
      { attributes: ['id'] },
    ))!;

    return await this.periodRepository.updateByPk(period.id, {
      isOpenForGrading,
    });
  };

  // Es el que el selector global muestra por defecto.
  public activateAcademicYear = async (
    actor: OrganizationActor,
    yearId: string,
  ) => {
    const year = await this.findOwnYear(actor, yearId);

    await this.transaction(async (transaction) => {
      await this.repository.deactivateAll(year.organizationId, transaction);
      await this.updateByPk(year.id, { isActive: true }, { transaction });
    });

    return await this.findAcademicYear(actor, year.id);
  };

  public deleteAcademicYear = async (
    actor: OrganizationActor,
    yearId: string,
  ) => {
    const year = await this.findOwnYear(actor, yearId);
    if (year.isActive) throw new ConflictException(ACTIVE_YEAR_DELETE_MESSAGE);

    await this.transaction(async (transaction) => {
      await this.periodRepository.deleteOthers(year.id, [], transaction);
      await this.deleteByPk(year.id, { transaction });
    });
  };
}
