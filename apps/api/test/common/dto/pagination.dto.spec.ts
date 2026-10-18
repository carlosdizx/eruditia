import 'reflect-metadata';
import { validate } from 'class-validator';
import { plainToClass } from 'class-transformer';
import { randomUUID } from 'crypto';
import PaginationDto from '@common/dto/pagination.dto';
import DataRangeEnum from '@common/enums/data-range.enum';

describe('PaginationDto', () => {
  let dto: PaginationDto;

  beforeEach(() => {
    dto = plainToClass(PaginationDto, {});
  });

  describe('Default values validation', () => {
    it('should create an instance with default values', () => {
      expect(dto).toBeDefined();
      expect(dto).toBeInstanceOf(PaginationDto);
    });

    it('should pass validation with default values', async () => {
      const { pageSize, page, search, orderBy, orderDirection } = dto;

      expect(pageSize).toBe(10);
      expect(page).toBe(1);
      expect(search).toBeUndefined();
      expect(orderBy).toBeUndefined();
      expect(orderDirection).toBeUndefined();
    });
  });

  describe('pageSize validation', () => {
    it('should accept a valid pageSize (1-100)', async () => {
      dto = new PaginationDto();

      for (let i = 1; i <= 100; i++) {
        dto.pageSize = i;
        const errors = await validate(dto);
        expect(errors.length).toBe(0);
      }
    });

    it('should reject a pageSize less than 1', async () => {
      dto.pageSize = 0;
      const errors = await validate(dto);
      expect(errors.length).toBe(1);
    });

    it('should reject a pageSize greater than 100', async () => {
      dto.pageSize = Number.MAX_VALUE;
      const errors = await validate(dto);
      expect(errors.length).toBe(1);
    });

    it('should reject a non-integer pageSize', async () => {
      dto.pageSize = 1.5;
      const errors = await validate(dto);
      expect(errors.length).toBe(1);
    });

    it('should reject a non-numeric pageSize', async () => {
      dto.pageSize = '-10' as any;
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('page validation', () => {
    it('should accept a valid page (>= 1)', async () => {
      for (let i = 1; i <= 1000; i++) {
        dto.page = i;
        const errors = await validate(dto);
        expect(errors.length).toBe(0);
      }
    });

    it('should reject a page less than 1', async () => {
      dto.page = 0;
      const errors = await validate(dto);
      expect(errors.length).toBe(1);
    });

    it('should reject a negative page', async () => {
      dto.page = -1; // Ajustado a -1 (originalmente estaba en 0 que es 'less than 1')
      const errors = await validate(dto);
      expect(errors.length).toBe(1);
    });

    it('should reject a non-numeric page', async () => {
      dto.page = '-10.5' as any;
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('search validation', () => {
    it('should accept search as a string', async () => {
      dto.search = 'hello';
      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should reject a non-string search', async () => {
      dto.search = 123 as any;
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThanOrEqual(1);
    });

    it('should allow an empty search (optional)', async () => {
      dto.search = '';
      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });
  });

  describe('orderBy validation', () => {
    it('should accept orderBy as a string', async () => {
      dto.orderBy = 'id';
      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should reject a non-string orderBy', async () => {
      dto.orderBy = 123 as any;
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('orderDirection validation', () => {
    it('should accept "ASC" orderDirection', async () => {
      dto.orderDirection = 'ASC';
      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should accept "DESC" orderDirection', async () => {
      dto.orderDirection = 'DESC';
      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should accept "asc" orderDirection (lowercase)', async () => {
      dto.orderDirection = 'asc';
      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should accept "desc" orderDirection (lowercase)', async () => {
      dto.orderDirection = 'desc';
      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should reject an invalid orderDirection', async () => {
      dto.orderDirection = 'invalid' as any;
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThanOrEqual(1);
    });

    it('should reject a non-string orderDirection', async () => {
      dto.orderDirection = 123 as any;
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Type transformation with @Type(() => Number)', () => {
    it('should transform pageSize from string to number', () => {
      const rawData = { pageSize: '50' };
      const transformedDto = plainToClass(PaginationDto, rawData);

      expect(transformedDto.pageSize).toBe(50);
      expect(typeof transformedDto.pageSize).toBe('number');
    });

    it('should transform page from string to number', () => {
      const rawData = { page: '5' };
      const transformedDto = plainToClass(PaginationDto, rawData);

      expect(transformedDto.page).toBe(5);
      expect(typeof transformedDto.page).toBe('number');
    });

    it('should transform multiple numeric fields correctly', () => {
      const rawData = {
        pageSize: '25',
        page: '3',
        search: 'test',
        orderBy: 'createdAt',
        orderDirection: 'ASC',
      };
      const transformedDto = plainToClass(PaginationDto, rawData);

      expect(transformedDto.pageSize).toBe(25);
      expect(transformedDto.page).toBe(3);
      expect(typeof transformedDto.pageSize).toBe('number');
      expect(typeof transformedDto.page).toBe('number');
      expect(transformedDto.search).toBe('test');
      expect(transformedDto.orderBy).toBe('createdAt');
      expect(transformedDto.orderDirection).toBe('ASC');
    });

    it('should validate correctly after transforming types', async () => {
      const rawData = { pageSize: '50', page: '2' };
      const transformedDto = plainToClass(PaginationDto, rawData);

      const errors = await validate(transformedDto);
      expect(errors.length).toBe(0);
      expect(transformedDto.pageSize).toBe(50);
      expect(transformedDto.page).toBe(2);
    });

    it('should keep default values if none are provided', () => {
      const rawData = {};
      const transformedDto = plainToClass(PaginationDto, rawData);

      expect(transformedDto.pageSize).toBe(10);
      expect(transformedDto.page).toBe(1);
    });

    it('should transform and validate boundary values', async () => {
      const rawData = { pageSize: '1', page: '100' };
      const transformedDto = plainToClass(PaginationDto, rawData);

      expect(transformedDto.pageSize).toBe(1);
      expect(transformedDto.page).toBe(100);

      const errors = await validate(transformedDto);
      expect(errors.length).toBe(0);
    });

    it('should fail validation if transformation results in invalid values', async () => {
      const rawData = { pageSize: '150', page: '0' };
      const transformedDto = plainToClass(PaginationDto, rawData);

      expect(transformedDto.pageSize).toBe(150);
      expect(transformedDto.page).toBe(0);

      const errors = await validate(transformedDto);
      expect(errors.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Full validation with multiple fields', () => {
    it('should validate correctly with all valid fields', async () => {
      dto = new PaginationDto();
      dto.pageSize = 99;
      dto.page = 1000;
      dto.search = randomUUID();
      dto.orderBy = 'id';
      dto.orderDirection = 'DESC';

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should fail if any field is invalid', async () => {
      dto.pageSize = 0;
      dto.page = -1;
      dto.search = [] as any;
      dto.orderBy = { id: randomUUID() } as any;
      dto.orderDirection = false as any;

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Filter search validation', () => {
    it('should validate that it can search by a string type filter', () => {
      dto = new PaginationDto();
      dto.range = DataRangeEnum.CUSTOM;
      dto.dateFirst = new Date('1998-01-13');
      dto.dateEnd = new Date('1998-01-14');

      expect(dto.range).toBe(DataRangeEnum.CUSTOM);
      expect(dto.dateFirst).toBeInstanceOf(Date);
      expect(dto.dateEnd).toBeInstanceOf(Date);
    });

    it('should validate that it correctly transforms from string to Date', () => {
      const rawData = {
        range: DataRangeEnum.CUSTOM,
        dateFirst: '2025-11-05 00:00:00',
        dateEnd: '2025-11-06 23:59:59',
      };

      dto = plainToClass(PaginationDto, rawData);

      expect(dto.range).toBe(DataRangeEnum.CUSTOM);

      if (!dto.dateFirst) throw new Error('dateFirst is undefined');
      if (!dto.dateEnd) throw new Error('dateEnd is undefined');

      expect(dto.dateFirst).toBeInstanceOf(Date);
      expect(dto.dateEnd).toBeInstanceOf(Date);

      expect(dto.dateFirst.getFullYear()).toBe(2025);
      expect(dto.dateFirst.getMonth()).toBe(10); // November (0-indexed)
      expect(dto.dateFirst.getDate()).toBe(5);
      expect(dto.dateFirst.getHours()).toBe(0);
      expect(dto.dateFirst.getMinutes()).toBe(0);
      expect(dto.dateFirst.getSeconds()).toBe(0);

      expect(dto.dateEnd.getFullYear()).toBe(2025);
      expect(dto.dateEnd.getMonth()).toBe(10); // November (0-indexed)
      expect(dto.dateEnd.getDate()).toBe(6);
      expect(dto.dateEnd.getHours()).toBe(23);
      expect(dto.dateEnd.getMinutes()).toBe(59);
      expect(dto.dateEnd.getSeconds()).toBe(59);

      expect(dto.dateEnd.getTime()).toBeGreaterThan(dto.dateFirst.getTime());
    });
  });
});
