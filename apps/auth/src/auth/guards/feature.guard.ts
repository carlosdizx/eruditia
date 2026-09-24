import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Inject,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import DRIZZLE from '@database/database.constants';
import type { DrizzleDb } from '@database/types/drizzle.types';
import findOrganizationMetadata from '@database/queries/find-organization-metadata.query';
import parseOrganizationMetadata from '@common/utils/parse-organization-metadata.util';
import Feature from '@auth/enums/feature.enum';
import { REQUIRED_FEATURES_KEY } from '@auth/constants/auth-metadata.constants';
import getRequestSession from '@auth/utils/get-request-session.util';
import getActiveOrganizationId from '@auth/utils/get-active-organization-id.util';

// Subscription-level check: the organization of the user must have every
// required feature in its metadata, whatever the role of the user is.
@Injectable()
export default class FeatureGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    @Inject(DRIZZLE) private readonly db: DrizzleDb,
  ) {}

  public async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredFeatures = this.reflector.getAllAndOverride<
      Feature[] | undefined
    >(REQUIRED_FEATURES_KEY, [context.getHandler(), context.getClass()]);

    if (!requiredFeatures?.length) return true;

    const organizationId = getActiveOrganizationId(getRequestSession(context));
    const { features } = parseOrganizationMetadata(
      await findOrganizationMetadata(this.db, organizationId),
    );
    const missing = requiredFeatures.filter(
      (feature) => !features.includes(feature),
    );

    if (missing.length) {
      throw new ForbiddenException(
        `Your organization does not have access to: ${missing.join(', ')}`,
      );
    }

    return true;
  }
}
