import { GUARDS_METADATA } from '@nestjs/common/constants';
import RequireFeature from '@auth/decorators/require-feature.decorator';
import Feature from '@auth/enums/feature.enum';
import FeatureGuard from '@auth/guards/feature.guard';
import { REQUIRED_FEATURES_KEY } from '@auth/constants/auth-metadata.constants';

describe('RequireFeature', () => {
  class Controller {
    @RequireFeature(Feature.FINANCE_MODULE, Feature.REPORTS_ADVANCED)
    public handler() {
      return undefined;
    }
  }

  const handler = Object.getOwnPropertyDescriptor(
    Controller.prototype,
    'handler',
  )?.value as object;

  it('stores the required features', () => {
    expect(Reflect.getMetadata(REQUIRED_FEATURES_KEY, handler)).toEqual([
      'finance_module',
      'reports:advanced',
    ]);
  });

  it('applies FeatureGuard, so the features are always enforced', () => {
    expect(Reflect.getMetadata(GUARDS_METADATA, handler)).toEqual([
      FeatureGuard,
    ]);
  });
});
