import { applyDecorators, SetMetadata, UseGuards } from '@nestjs/common';
import Feature from '@auth/enums/feature.enum';
import { REQUIRED_FEATURES_KEY } from '@auth/constants/auth-metadata.constants';
import FeatureGuard from '@auth/guards/feature.guard';

// Requires the organization of the user to have every one of `features`
// contracted. Applies FeatureGuard itself, like RequireRoles.
const RequireFeature = (...features: Feature[]) =>
  applyDecorators(
    SetMetadata(REQUIRED_FEATURES_KEY, features),
    UseGuards(FeatureGuard),
  );

export default RequireFeature;
