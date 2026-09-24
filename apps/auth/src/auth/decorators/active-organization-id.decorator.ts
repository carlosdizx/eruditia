import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import getRequestSession from '@auth/utils/get-request-session.util';
import getActiveOrganizationId from '@auth/utils/get-active-organization-id.util';

// Injects the id of the active organization of the caller into a handler.
const ActiveOrganizationId = createParamDecorator(
  (_data: unknown, context: ExecutionContext): string =>
    getActiveOrganizationId(getRequestSession(context)),
);

export default ActiveOrganizationId;
