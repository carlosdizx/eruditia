import 'reflect-metadata';
import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import DeletedFilterEnum from '@common/enums/deleted-filter.enum';
import ListOrganizationsDto from '../../../src/organizations/dto/list-organizations.dto';

describe('ListOrganizationsDto', () => {
  it('excludes deleted organizations by default', async () => {
    const dto = plainToInstance(ListOrganizationsDto, {});

    expect(dto.deleted).toBe(DeletedFilterEnum.EXCLUDE);
    expect(dto.page).toBe(1);
    await expect(validate(dto)).resolves.toHaveLength(0);
  });

  it.each(Object.values(DeletedFilterEnum))(
    'accepts deleted=%s',
    async (deleted) => {
      const dto = plainToInstance(ListOrganizationsDto, { deleted });

      await expect(validate(dto)).resolves.toHaveLength(0);
    },
  );

  it('rejects an unknown deleted filter', async () => {
    const dto = plainToInstance(ListOrganizationsDto, { deleted: 'all' });
    const errors = await validate(dto);

    expect(errors.map(({ property }) => property)).toEqual(['deleted']);
  });
});
