import 'reflect-metadata';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Op, Transaction } from 'sequelize';
import AcademicYearStatusEnum from '@common/enums/academic-year-status.enum';
import AcademicPeriodModel from '@database/models/academic-period.model';
import AcademicYearsService from '../../src/academic-years/academic-years.service';
import AcademicYearRepository from '../../src/academic-years/repositories/academic-year.repository';
import AcademicPeriodRepository from '../../src/academic-years/repositories/academic-period.repository';
import ClassroomRepository from '../../src/classrooms/classroom.repository';
import { ACADEMIC_YEAR_HAS_CLASSROOMS_MESSAGE } from '../../src/classrooms/constants/classroom-messages.constant';
import {
  ACTIVE_YEAR_DELETE_MESSAGE,
  ACADEMIC_YEAR_NAME_IN_USE_MESSAGE,
  CLOSED_YEAR_MESSAGE,
  INVALID_DATE_RANGE_MESSAGE,
  PERIOD_NOT_IN_YEAR_MESSAGE,
} from '../../src/academic-years/constants/academic-year-messages.constant';

describe('AcademicYearsService', () => {
  let repository: {
    findOne: jest.Mock;
    findAll: jest.Mock;
    create: jest.Mock;
    updateByPk: jest.Mock;
    deleteByPk: jest.Mock;
    deactivateAll: jest.Mock;
    transaction: jest.Mock;
  };
  let periodRepository: {
    findOne: jest.Mock;
    findAll: jest.Mock;
    insertMany: jest.Mock;
    updateByPk: jest.Mock;
    closeGradingOfYear: jest.Mock;
    deleteOthers: jest.Mock;
  };
  let classroomRepository: { findOne: jest.Mock };
  let service: AcademicYearsService;

  const transaction = { id: 'tx' } as unknown as Transaction;
  const actor = { organizationId: 'org-id' };

  const year = (overrides: Record<string, unknown> = {}) => ({
    id: 'year-id',
    organizationId: 'org-id',
    name: '2026',
    startDate: '2026-01-20',
    endDate: '2026-11-30',
    isActive: true,
    status: AcademicYearStatusEnum.OPEN,
    ...overrides,
  });

  const quarters = [1, 2, 3, 4].map((n) => ({
    name: `Periodo ${n}`,
    weightPercentage: 25,
  }));

  const include = [{ model: AcademicPeriodModel, as: 'periods' }];
  const order = [
    ['startDate', 'DESC'],
    [{ model: AcademicPeriodModel, as: 'periods' }, 'orderIndex', 'ASC'],
  ];

  // findOne por id responde el año; el resto (nombre, activo) no encuentra nada.
  const mockYear = (target = year()) =>
    repository.findOne.mockImplementation((query: { id?: unknown }) =>
      Promise.resolve(typeof query.id === 'string' ? target : null),
    );

  beforeEach(() => {
    repository = {
      findOne: jest.fn().mockResolvedValue(null),
      findAll: jest.fn().mockResolvedValue([]),
      create: jest.fn((data: object) =>
        Promise.resolve({ id: 'year-id', ...data }),
      ),
      updateByPk: jest.fn().mockResolvedValue({}),
      deleteByPk: jest.fn().mockResolvedValue({}),
      deactivateAll: jest.fn().mockResolvedValue(undefined),
      transaction: jest.fn((run: (tx: Transaction) => unknown) =>
        run(transaction),
      ),
    };
    periodRepository = {
      findOne: jest.fn().mockResolvedValue({ id: 'period-id' }),
      findAll: jest.fn().mockResolvedValue([]),
      insertMany: jest.fn().mockResolvedValue([]),
      updateByPk: jest.fn((id: string, data: object) =>
        Promise.resolve({ id, ...data }),
      ),
      closeGradingOfYear: jest.fn().mockResolvedValue(undefined),
      deleteOthers: jest.fn().mockResolvedValue(undefined),
    };
    classroomRepository = { findOne: jest.fn().mockResolvedValue(null) };
    service = new AcademicYearsService(
      repository as unknown as AcademicYearRepository,
      periodRepository as unknown as AcademicPeriodRepository,
      classroomRepository as unknown as ClassroomRepository,
    );
  });

  describe('listAcademicYears', () => {
    it('lists the organization years, newest first, with ordered periods', async () => {
      await service.listAcademicYears(actor);

      expect(repository.findAll).toHaveBeenCalledWith(
        { organizationId: 'org-id' },
        { include, order },
      );
    });

    it('rejects an actor without organization', async () => {
      await expect(
        service.listAcademicYears({ organizationId: null }),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });
  });

  describe('createAcademicYear', () => {
    const dto = {
      name: '2026',
      startDate: '2026-01-20',
      endDate: '2026-11-30',
      periods: quarters,
    };

    it('creates the year and its periods in order inside a transaction', async () => {
      mockYear();

      await service.createAcademicYear(actor, dto);

      expect(repository.create).toHaveBeenCalledWith(
        {
          name: '2026',
          startDate: '2026-01-20',
          endDate: '2026-11-30',
          organizationId: 'org-id',
          isActive: true,
        },
        { transaction },
      );
      expect(periodRepository.insertMany).toHaveBeenCalledWith(
        quarters.map((period, index) => ({
          ...period,
          organizationId: 'org-id',
          academicYearId: 'year-id',
          orderIndex: index + 1,
        })),
        { transaction },
      );
    });

    it('does not activate it when the organization already has an active year', async () => {
      repository.findOne.mockImplementation(
        (query: { id?: string; isActive?: boolean }) =>
          Promise.resolve(query.id || query.isActive ? year() : null),
      );

      await service.createAcademicYear(actor, dto);

      expect(repository.create).toHaveBeenCalledWith(
        expect.objectContaining({ isActive: false }),
        { transaction },
      );
    });

    it('accepts weights with decimals that add up to 100', async () => {
      mockYear();

      await expect(
        service.createAcademicYear(actor, {
          ...dto,
          periods: [33.33, 33.33, 33.34].map((weightPercentage) => ({
            name: 'P',
            weightPercentage,
          })),
        }),
      ).resolves.toBeDefined();
    });

    it('rejects weights that do not add up to 100', async () => {
      await expect(
        service.createAcademicYear(actor, {
          ...dto,
          periods: quarters.slice(0, 3),
        }),
      ).rejects.toThrow(
        'Los porcentajes de los periodos deben sumar 100% (suman 75%)',
      );
      expect(repository.create).not.toHaveBeenCalled();
    });

    it('rejects an end date before the start date', async () => {
      await expect(
        service.createAcademicYear(actor, { ...dto, endDate: '2026-01-01' }),
      ).rejects.toThrow(INVALID_DATE_RANGE_MESSAGE);
    });

    it('rejects a name already used in the organization', async () => {
      repository.findOne.mockResolvedValue({ id: 'other-id' });

      await expect(service.createAcademicYear(actor, dto)).rejects.toThrow(
        ACADEMIC_YEAR_NAME_IN_USE_MESSAGE,
      );
      expect(repository.findOne).toHaveBeenCalledWith(
        { organizationId: 'org-id', name: '2026' },
        false,
        { attributes: ['id'] },
      );
    });
  });

  describe('updateAcademicYear', () => {
    it('validates the dates against the stored ones', async () => {
      mockYear();

      await expect(
        service.updateAcademicYear(actor, 'year-id', {
          endDate: '2026-01-01',
        }),
      ).rejects.toThrow(INVALID_DATE_RANGE_MESSAGE);
    });

    it('checks the new name against the other years', async () => {
      mockYear();

      await service.updateAcademicYear(actor, 'year-id', { name: '2027' });

      expect(repository.findOne).toHaveBeenCalledWith(
        { organizationId: 'org-id', name: '2027', id: { [Op.ne]: 'year-id' } },
        false,
        { attributes: ['id'] },
      );
    });

    it('closes the grading of every period when the year is closed', async () => {
      mockYear();

      await service.updateAcademicYear(actor, 'year-id', {
        status: AcademicYearStatusEnum.CLOSED,
      });

      expect(repository.updateByPk).toHaveBeenCalledWith(
        'year-id',
        { status: AcademicYearStatusEnum.CLOSED },
        { transaction },
      );
      expect(periodRepository.closeGradingOfYear).toHaveBeenCalledWith(
        'year-id',
        transaction,
      );
    });

    it('returns 404 for a year of another organization', async () => {
      repository.findOne.mockRejectedValue(new NotFoundException());

      await expect(
        service.updateAcademicYear(actor, 'year-id', { name: '2027' }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('setAcademicPeriods', () => {
    beforeEach(() => {
      periodRepository.findAll.mockResolvedValue([{ id: 'p1' }, { id: 'p2' }]);
    });

    it('updates the kept periods, creates the new ones and deletes the rest', async () => {
      mockYear();

      await service.setAcademicPeriods(actor, 'year-id', {
        periods: [
          { id: 'p2', name: 'Primer semestre', weightPercentage: 50 },
          { name: 'Segundo semestre', weightPercentage: 50 },
        ],
      });

      expect(periodRepository.deleteOthers).toHaveBeenCalledWith(
        'year-id',
        ['p2'],
        transaction,
      );
      expect(periodRepository.updateByPk).toHaveBeenCalledWith(
        'p2',
        { name: 'Primer semestre', weightPercentage: 50, orderIndex: 1 },
        { transaction },
      );
      expect(periodRepository.insertMany).toHaveBeenCalledWith(
        [
          {
            organizationId: 'org-id',
            academicYearId: 'year-id',
            name: 'Segundo semestre',
            weightPercentage: 50,
            orderIndex: 2,
          },
        ],
        { transaction },
      );
    });

    it('rejects a period of another year', async () => {
      mockYear();

      await expect(
        service.setAcademicPeriods(actor, 'year-id', {
          periods: [{ id: 'foreign', name: 'P', weightPercentage: 100 }],
        }),
      ).rejects.toThrow(PERIOD_NOT_IN_YEAR_MESSAGE);
      expect(periodRepository.deleteOthers).not.toHaveBeenCalled();
    });

    it('rejects weights that do not add up to 100', async () => {
      mockYear();

      await expect(
        service.setAcademicPeriods(actor, 'year-id', {
          periods: [{ name: 'P', weightPercentage: 99.99 }],
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('rejects changes on a closed year', async () => {
      mockYear(year({ status: AcademicYearStatusEnum.CLOSED }));

      await expect(
        service.setAcademicPeriods(actor, 'year-id', { periods: quarters }),
      ).rejects.toThrow(CLOSED_YEAR_MESSAGE);
    });
  });

  describe('updateAcademicPeriod', () => {
    it('opens the grading of a period of the year', async () => {
      mockYear();

      await expect(
        service.updateAcademicPeriod(actor, 'year-id', 'period-id', {
          isOpenForGrading: true,
        }),
      ).resolves.toEqual({ id: 'period-id', isOpenForGrading: true });
      expect(periodRepository.findOne).toHaveBeenCalledWith(
        { id: 'period-id', academicYearId: 'year-id' },
        true,
        { attributes: ['id'] },
      );
    });

    it('does not open grading on a closed year, but allows closing it', async () => {
      mockYear(year({ status: AcademicYearStatusEnum.CLOSED }));

      await expect(
        service.updateAcademicPeriod(actor, 'year-id', 'period-id', {
          isOpenForGrading: true,
        }),
      ).rejects.toBeInstanceOf(ConflictException);
      await expect(
        service.updateAcademicPeriod(actor, 'year-id', 'period-id', {
          isOpenForGrading: false,
        }),
      ).resolves.toBeDefined();
    });
  });

  describe('activateAcademicYear', () => {
    it('deactivates the others and activates this one in a transaction', async () => {
      mockYear(year({ isActive: false }));

      await service.activateAcademicYear(actor, 'year-id');

      expect(repository.deactivateAll).toHaveBeenCalledWith(
        'org-id',
        transaction,
      );
      expect(repository.updateByPk).toHaveBeenCalledWith(
        'year-id',
        { isActive: true },
        { transaction },
      );
    });
  });

  describe('deleteAcademicYear', () => {
    it('deletes an inactive year with its periods', async () => {
      mockYear(year({ isActive: false }));

      await service.deleteAcademicYear(actor, 'year-id');

      expect(periodRepository.deleteOthers).toHaveBeenCalledWith(
        'year-id',
        [],
        transaction,
      );
      expect(repository.deleteByPk).toHaveBeenCalledWith('year-id', {
        transaction,
      });
    });

    it('does not delete a year with classrooms', async () => {
      mockYear(year({ isActive: false }));
      classroomRepository.findOne.mockResolvedValue({ id: 'classroom-id' });

      await expect(
        service.deleteAcademicYear(actor, 'year-id'),
      ).rejects.toThrow(ACADEMIC_YEAR_HAS_CLASSROOMS_MESSAGE);
      expect(classroomRepository.findOne).toHaveBeenCalledWith(
        { academicYearId: 'year-id' },
        false,
        { attributes: ['id'] },
      );
      expect(repository.deleteByPk).not.toHaveBeenCalled();
    });

    it('does not delete the active year', async () => {
      mockYear();

      await expect(
        service.deleteAcademicYear(actor, 'year-id'),
      ).rejects.toThrow(ACTIVE_YEAR_DELETE_MESSAGE);
      expect(repository.deleteByPk).not.toHaveBeenCalled();
    });
  });
});
