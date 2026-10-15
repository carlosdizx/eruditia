import 'reflect-metadata';
import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import PermissionEnum from '@common/enums/permission.enum';
import RoleNameEnum from '@common/enums/role-name.enum';
import { IS_PUBLIC_KEY } from '@auth/decorators/public.decorator';
import { AUTH_WITH_PERMISSIONS_KEY } from '@auth/decorators/auth-with-permissions.decorator';
import GradeLevelsController from '../../src/grade-levels/grade-levels.controller';
import GradeLevelsService from '../../src/grade-levels/grade-levels.service';
import CreateGradeLevelDto from '../../src/grade-levels/dto/create-grade-level.dto';
import authContextFixture from '../auth/fixtures/auth-context.fixture';

const handlerMetadata = (handler: string, key: string): unknown =>
  Reflect.getMetadata(
    key,
    Object.getOwnPropertyDescriptor(GradeLevelsController.prototype, handler)!
      .value as object,
  );

describe('GradeLevelsController', () => {
  let service: Record<string, jest.Mock>;
  let controller: GradeLevelsController;

  const auth = authContextFixture();

  beforeEach(() => {
    service = Object.fromEntries(
      [
        'listGradeLevels',
        'createGradeLevel',
        'loadStandardGradeLevels',
        'updateGradeLevel',
        'deleteGradeLevel',
      ].map((name) => [name, jest.fn().mockResolvedValue({ id: 'grade-id' })]),
    );
    controller = new GradeLevelsController(
      service as unknown as GradeLevelsService,
    );
  });

  describe.each([
    ['listGradeLevels', PermissionEnum.GRADE_LEVEL_LIST],
    ['createGradeLevel', PermissionEnum.GRADE_LEVEL_CREATE],
    ['loadStandardGradeLevels', PermissionEnum.GRADE_LEVEL_CREATE],
    ['updateGradeLevel', PermissionEnum.GRADE_LEVEL_UPDATE],
    ['deleteGradeLevel', PermissionEnum.GRADE_LEVEL_DELETE],
  ])('%s', (handler, permission) => {
    it(`requires the ADMIN role and the ${permission} permission`, () => {
      expect(handlerMetadata(handler, AUTH_WITH_PERMISSIONS_KEY)).toEqual({
        roles: [RoleNameEnum.ADMIN],
        permissions: [permission],
        mode: 'all',
      });
      expect(handlerMetadata(handler, IS_PUBLIC_KEY)).toBeUndefined();
    });
  });

  it('delegates with the current organization', async () => {
    const dto = { name: 'Primero', shortName: '1°', sequenceOrder: 1 };

    await controller.listGradeLevels(auth);
    await controller.createGradeLevel(dto, auth);
    await controller.loadStandardGradeLevels(auth);
    await controller.updateGradeLevel('grade-id', { name: 'Uno' }, auth);
    await expect(
      controller.deleteGradeLevel('grade-id', auth),
    ).resolves.toBeUndefined();

    expect(service.listGradeLevels).toHaveBeenCalledWith(auth);
    expect(service.createGradeLevel).toHaveBeenCalledWith(auth, dto);
    expect(service.loadStandardGradeLevels).toHaveBeenCalledWith(auth);
    expect(service.updateGradeLevel).toHaveBeenCalledWith(auth, 'grade-id', {
      name: 'Uno',
    });
    expect(service.deleteGradeLevel).toHaveBeenCalledWith(auth, 'grade-id');
  });
});

describe('CreateGradeLevelDto', () => {
  const errorsOf = async (plain: Record<string, unknown>) =>
    (await validate(plainToInstance(CreateGradeLevelDto, plain))).map(
      ({ property }) => property,
    );

  it('accepts preschool grades with a negative order', async () => {
    await expect(
      errorsOf({ name: 'Jardín', shortName: 'J', sequenceOrder: -1 }),
    ).resolves.toEqual([]);
  });

  it('rejects empty names and a non integer order', async () => {
    await expect(
      errorsOf({ name: '', shortName: '', sequenceOrder: 1.5 }),
    ).resolves.toEqual(['name', 'shortName', 'sequenceOrder']);
  });
});
