import 'reflect-metadata';
import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import CreateAcademicYearDto from '../../../src/academic-years/dto/create-academic-year.dto';
import UpdateAcademicYearDto from '../../../src/academic-years/dto/update-academic-year.dto';
import SetAcademicPeriodsDto from '../../../src/academic-years/dto/set-academic-periods.dto';

const errorsOf = async <T extends object>(
  cls: new () => T,
  plain: Record<string, unknown>,
) =>
  (await validate(plainToInstance(cls, plain))).map(({ property }) => property);

const quarters = [1, 2, 3, 4].map((n) => ({
  name: `Periodo ${n}`,
  weightPercentage: 25,
}));

describe('CreateAcademicYearDto', () => {
  const valid = {
    name: '2026',
    startDate: '2026-01-20',
    endDate: '2026-11-30',
    periods: quarters,
  };

  it('accepts a year with its periods', async () => {
    await expect(errorsOf(CreateAcademicYearDto, valid)).resolves.toEqual([]);
  });

  it('requires name, dates and at least one period', async () => {
    await expect(
      errorsOf(CreateAcademicYearDto, { periods: [] }),
    ).resolves.toEqual(['name', 'startDate', 'endDate', 'periods']);
  });

  it('rejects dates with time or impossible days', async () => {
    await expect(
      errorsOf(CreateAcademicYearDto, {
        ...valid,
        startDate: '2026-01-20T08:00',
        endDate: '2026-02-30',
      }),
    ).resolves.toEqual(['startDate', 'endDate']);
  });
});

describe('SetAcademicPeriodsDto', () => {
  it('validates every period', async () => {
    await expect(
      errorsOf(SetAcademicPeriodsDto, {
        periods: [
          { id: 'x', name: '', weightPercentage: 0 },
          { name: 'P', weightPercentage: 33.333 },
        ],
      }),
    ).resolves.toEqual(['periods']);
  });

  it('allows at most 6 periods', async () => {
    await expect(
      errorsOf(SetAcademicPeriodsDto, {
        periods: Array.from({ length: 7 }, () => ({
          name: 'P',
          weightPercentage: 10,
        })),
      }),
    ).resolves.toEqual(['periods']);
  });
});

describe('UpdateAcademicYearDto', () => {
  it('accepts closing the year alone and rejects an unknown status', async () => {
    await expect(
      errorsOf(UpdateAcademicYearDto, { status: 'closed' }),
    ).resolves.toEqual([]);
    await expect(
      errorsOf(UpdateAcademicYearDto, { status: 'cerrado' }),
    ).resolves.toEqual(['status']);
  });
});
