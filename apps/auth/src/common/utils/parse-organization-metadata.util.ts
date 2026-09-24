import OrganizationMetadata, {
  organizationMetadataSchema,
} from '@common/schemas/organization-metadata.schema';

// Better Auth returns metadata either as the raw JSON string from the
// database or already parsed. Anything missing or malformed means "no
// features" — access is denied rather than guessed.
const parseOrganizationMetadata = (metadata: unknown): OrganizationMetadata => {
  let value = metadata;

  if (typeof value === 'string') {
    try {
      value = JSON.parse(value);
    } catch {
      value = {};
    }
  }

  const result = organizationMetadataSchema.safeParse(value ?? {});

  return result.success ? result.data : { features: [] };
};

export default parseOrganizationMetadata;
