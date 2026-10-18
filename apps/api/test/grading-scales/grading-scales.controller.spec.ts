import 'reflect-metadata';
import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import PermissionEnum from '@common/enums/permission.enum';
import RoleNameEnum from '@common/enums/role-name.enum';
import { IS_PUBLIC_KEY } from '@auth/decorators/public.decorator';
import { AUTH_WITH_PERMISSIONS_KEY } from '@auth/decorators/auth-with-permissions.decorator';
import GradingScalesController from '../../src/grading-scales/grading-scales.controller';
import GradingScalesService from '../../src/grading-scales/grading-scales.service';
import SetGradingScaleDto from '../../src/grading-scales/dto/set-grading-scale.dto';
import authContextFixture from '../auth/fixtures/auth-context.fixture';

const handlerMetadata = (handler: string, key: string): unknown =>
  Reflect.getMetadata(
    key,
    Object.getOwnPropertyDescriptor(GradingScalesController.prototype, handler)!
      .value as object,
  );

describe('GradingScalesController', () => {
  let service: Record<string, jest.Mock>;
  let controller: GradingScalesController;

  const auth = authContextFixture();
  const scale = {
    minScore: 1,
    maxScore: 5,
    passingScore: 3,
    decimalPlaces: 1,
  };

  beforeEach(() => {
    service = {
      getScale: jest.fn().mockResolvedValue(scale),
      setScale: jest.fn().mockResolvedValue(scale),
    };
    controller = new GradingScalesController(
      service as unknown as GradingScalesService,
    );
  });

  it('lets any authenticated user read the scale', async () => {
    expect(
      handlerMetadata('getGradingScale', AUTH_WITH_PERMISSIONS_KEY),
    ).toBeUndefined();
    expect(handlerMetadata('getGradingScale', IS_PUBLIC_KEY)).toBeUndefined();

    await expect(controller.getGradingScale(auth)).resolves.toBe(scale);
    expect(service.getScale).toHaveBeenCalledWith(auth);
  });

  it('requires the ADMIN role and grading-scale:update to change it', async () => {
    expect(
      handlerMetadata('setGradingScale', AUTH_WITH_PERMISSIONS_KEY),
    ).toEqual({
      roles: [RoleNameEnum.ADMIN],
      permissions: [PermissionEnum.GRADING_SCALE_UPDATE],
      mode: 'all',
    });

    await controller.setGradingScale(scale, auth);
    expect(service.setScale).toHaveBeenCalledWith(auth, scale);
  });

  describe('SetGradingScaleDto', () => {
    const errorsOf = async (body: object) =>
      (await validate(plainToInstance(SetGradingScaleDto, body))).map(
        ({ property }) => property,
      );

    it('accepts a valid scale', async () => {
      await expect(errorsOf(scale)).resolves.toEqual([]);
    });

    it('rejects decimals other than 1 or 2 and out-of-limit scores', async () => {
      await expect(
        errorsOf({ ...scale, decimalPlaces: 3, maxScore: 101, minScore: -1 }),
      ).resolves.toEqual(
        expect.arrayContaining(['decimalPlaces', 'maxScore', 'minScore']),
      );
    });
  });
});
