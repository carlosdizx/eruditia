import 'reflect-metadata';
import { Transaction } from 'sequelize';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import GradingScalesService, {
  DEFAULT_GRADING_SCALE,
} from '../../src/grading-scales/grading-scales.service';
import GradingScaleRepository from '../../src/grading-scales/grading-scale.repository';
import StudentGradeRepository from '../../src/gradebooks/repositories/student-grade.repository';
import PeriodSubjectSummaryRepository from '../../src/gradebooks/repositories/period-subject-summary.repository';
import {
  GRADING_SCALE_DECIMALS_MESSAGE,
  GRADING_SCALE_GRADES_OUTSIDE_MESSAGE,
  GRADING_SCALE_PASSING_MESSAGE,
  GRADING_SCALE_RANGE_MESSAGE,
} from '../../src/grading-scales/constants/grading-scale-messages.constant';

describe('GradingScalesService', () => {
  let repository: {
    findOne: jest.Mock;
    create: jest.Mock;
    updateByPk: jest.Mock;
    transaction: jest.Mock;
  };
  let studentGradeRepository: { findOutsideScale: jest.Mock };
  let summaryRepository: { refreshPassed: jest.Mock };
  let service: GradingScalesService;

  const transaction = { id: 'tx' } as unknown as Transaction;
  const actor = { organizationId: 'org-id' };
  const range = {
    minScore: 0,
    maxScore: 10,
    passingScore: 6,
    decimalPlaces: 1,
  };
  const scale = { ...range, maxFailedSubjects: 3 };

  beforeEach(() => {
    repository = {
      findOne: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockResolvedValue({ id: 'scale-id' }),
      updateByPk: jest.fn().mockResolvedValue({ id: 'scale-id' }),
      transaction: jest.fn((run: (tx: Transaction) => unknown) =>
        run(transaction),
      ),
    };
    studentGradeRepository = {
      findOutsideScale: jest.fn().mockResolvedValue(null),
    };
    summaryRepository = { refreshPassed: jest.fn().mockResolvedValue({}) };
    service = new GradingScalesService(
      repository as unknown as GradingScaleRepository,
      studentGradeRepository as unknown as StudentGradeRepository,
      summaryRepository as unknown as PeriodSubjectSummaryRepository,
    );
  });

  describe('getScale', () => {
    it('falls back to the default 1.0 - 5.0 scale', async () => {
      await expect(service.getScale(actor)).resolves.toEqual(
        DEFAULT_GRADING_SCALE,
      );
      expect(repository.findOne).toHaveBeenCalledWith(
        { organizationId: 'org-id' },
        false,
        expect.any(Object),
      );
    });

    it('returns the configured scale', async () => {
      repository.findOne.mockResolvedValue({ id: 'scale-id', ...scale });

      await expect(service.getScale(actor)).resolves.toEqual({
        ...scale,
        isDefault: false,
      });
    });

    it('rejects an actor without organization', async () => {
      await expect(
        service.getScale({ organizationId: null }),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });
  });

  describe('setScale', () => {
    it('creates the scale the first time', async () => {
      await expect(service.setScale(actor, scale)).resolves.toEqual({
        ...scale,
        isDefault: false,
      });
      expect(repository.create).toHaveBeenCalledWith(
        { ...scale, organizationId: 'org-id' },
        { transaction },
      );
      expect(repository.updateByPk).not.toHaveBeenCalled();
      expect(summaryRepository.refreshPassed).toHaveBeenCalledWith(
        'org-id',
        6,
        transaction,
      );
    });

    it('replaces the existing scale', async () => {
      repository.findOne.mockResolvedValue({ id: 'scale-id', passingScore: 6 });

      await service.setScale(actor, scale);

      expect(repository.updateByPk).toHaveBeenCalledWith('scale-id', scale, {
        transaction,
      });
      expect(repository.create).not.toHaveBeenCalled();
      // Misma nota aprobatoria: no hay definitivas que reevaluar.
      expect(summaryRepository.refreshPassed).not.toHaveBeenCalled();
    });

    it('re-evaluates the summaries when the passing score changes', async () => {
      repository.findOne.mockResolvedValue({ id: 'scale-id', passingScore: 3 });

      await service.setScale(actor, scale);

      expect(summaryRepository.refreshPassed).toHaveBeenCalledWith(
        'org-id',
        6,
        transaction,
      );
    });

    it('rejects a scale that would leave recorded grades outside', async () => {
      studentGradeRepository.findOutsideScale.mockResolvedValue({
        id: 'grade-id',
        score: 4.25,
      });

      await expect(service.setScale(actor, scale)).rejects.toThrow(
        new ConflictException(GRADING_SCALE_GRADES_OUTSIDE_MESSAGE(4.25)),
      );
      expect(studentGradeRepository.findOutsideScale).toHaveBeenCalledWith(
        'org-id',
        range,
      );
      expect(repository.transaction).not.toHaveBeenCalled();
    });

    it.each([
      [{ minScore: 5, maxScore: 5 }, GRADING_SCALE_RANGE_MESSAGE],
      [{ minScore: 6, maxScore: 5 }, GRADING_SCALE_RANGE_MESSAGE],
      [{ passingScore: 0 }, GRADING_SCALE_PASSING_MESSAGE],
      [{ passingScore: 11 }, GRADING_SCALE_PASSING_MESSAGE],
      [{ passingScore: 6.25 }, GRADING_SCALE_DECIMALS_MESSAGE(1)],
    ])('rejects %o', async (override, message) => {
      await expect(
        service.setScale(actor, { ...scale, ...override }),
      ).rejects.toThrow(new BadRequestException(message));
      expect(repository.create).not.toHaveBeenCalled();
    });

    it('turns off the failed subjects rule without a value', async () => {
      await expect(service.setScale(actor, range)).resolves.toMatchObject({
        maxFailedSubjects: null,
      });
    });

    it('accepts two decimals when configured', async () => {
      await expect(
        service.setScale(actor, {
          ...scale,
          passingScore: 6.25,
          decimalPlaces: 2,
        }),
      ).resolves.toMatchObject({ passingScore: 6.25 });
    });
  });
});
