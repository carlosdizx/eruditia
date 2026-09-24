import { APIError } from 'better-auth/api';
import protectOrganizationMetadataHook from '@auth/hooks/protect-organization-metadata.hook';

describe('protectOrganizationMetadataHook', () => {
  it('allows updates that do not touch the metadata', async () => {
    await expect(
      protectOrganizationMetadataHook({
        organization: { name: 'Acme Inc', logo: null } as {
          metadata?: unknown;
        },
      }),
    ).resolves.toBeUndefined();
  });

  it.each([
    ['grants a feature', { features: ['finance_module'] }],
    ['clears the metadata', null],
    ['sends empty metadata', {}],
  ])('rejects an update that %s with 403', async (_label, metadata) => {
    const promise = protectOrganizationMetadataHook({
      organization: { metadata },
    });

    await expect(promise).rejects.toBeInstanceOf(APIError);
    await expect(promise).rejects.toMatchObject({
      status: 'FORBIDDEN',
      message: 'Organization features can only be changed by the system',
    });
  });
});
