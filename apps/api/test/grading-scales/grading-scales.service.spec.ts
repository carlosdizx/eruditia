import 'reflect-metadata';
import { BadRequestException, ForbiddenException } from '@nestjs/common';
import GradingScalesService, {
  DEFAULT_GRADING_SCALE,
} from '../../src/grading-scales/grading-scales.service';
import GradingScaleRepository from '../../src/grading-scales/grading-scale.repository';
import {
  GRADING_SCALE_DECIMALS_MESSAGE,
  GRADING_SCALE_PASSING_MESSAGE,
  GRADING_SCALE_RANGE_MESSAGE,
} from '../../src/grading-scales/constants/grading-scale-messages.constant';

describe('GradingScalesService', () => {
  let repository: {
    findOne: jest.Mock;
    create: jest.Mock;
    updateByPk: jest.Mock;
  };
  let service: GradingScalesService;

  const actor = { organizationId: 'org-id' };
  const scale = {
    minScore: 0,
    maxScore: 10,
    passingScore: 6,
    decimalPlaces: 1,
  };

  beforeEach(() => {
    repository = {
      findOne: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockResolvedValue({ id: 'scale-id' }),
      updateByPk: jest.fn().mockResolvedValue({ id: 'scale-id' }),
    };
    service = new GradingScalesService(
      repository as unknown as GradingScaleRepository,
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
        undefined,
      );
      expect(repository.updateByPk).not.toHaveBeenCalled();
    });

    it('replaces the existing scale', async () => {
      repository.findOne.mockResolvedValue({ id: 'scale-id' });

      await service.setScale(actor, scale);

      expect(repository.updateByPk).toHaveBeenCalledWith(
        'scale-id',
        scale,
        undefined,
      );
      expect(repository.create).not.toHaveBeenCalled();
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
