import 'reflect-metadata';
import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import LookupReportCardDto from '../../../src/report-cards/dto/lookup-report-card.dto';

const YEAR_ID = '0192f1a0-0000-7000-8000-000000000001';

describe('LookupReportCardDto', () => {
  it('drops dots, commas and spaces from the document', async () => {
    const dto = plainToInstance(LookupReportCardDto, {
      academicYearId: YEAR_ID,
      documentNumber: ' 1.001,234 567 ',
    });

    expect(dto.documentNumber).toBe('1001234567');
    await expect(validate(dto)).resolves.toEqual([]);
  });

  it('requires the year and a valid document', async () => {
    const errors = await validate(
      plainToInstance(LookupReportCardDto, { documentNumber: '10%' }),
    );

    expect(errors.map(({ property }) => property)).toEqual([
      'academicYearId',
      'documentNumber',
    ]);
  });
});
