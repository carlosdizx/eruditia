import { APIError } from 'better-auth/api';

export interface UpdateOrganizationData {
  organization: { metadata?: unknown };
}

// The metadata holds the features the organization has contracted, which
// FeatureGuard trusts. Organization admins can update their organization
// through Better Auth (name, logo, ...), so without this they could grant
// themselves any feature. Only the system sets the metadata.
const protectOrganizationMetadataHook = async ({
  organization,
}: UpdateOrganizationData): Promise<void> => {
  if (organization.metadata !== undefined) {
    throw new APIError('FORBIDDEN', {
      message: 'Organization features can only be changed by the system',
    });
  }
};

export default protectOrganizationMetadataHook;
