import { z } from 'zod';

// Shape of `organization.metadata` (stored as a JSON string by Better Auth).
const organizationMetadataSchema = z.object({
  features: z.array(z.string()).default([]),
});

type OrganizationMetadata = z.infer<typeof organizationMetadataSchema>;

export { organizationMetadataSchema };

export default OrganizationMetadata;
