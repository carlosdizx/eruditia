import parseOrganizationMetadata from '@common/utils/parse-organization-metadata.util';

describe('parseOrganizationMetadata', () => {
  it('parses the JSON string stored in the database', () => {
    expect(
      parseOrganizationMetadata(
        '{"features":["finance_module","api:external"]}',
      ),
    ).toEqual({ features: ['finance_module', 'api:external'] });
  });

  it('accepts metadata that is already an object', () => {
    expect(parseOrganizationMetadata({ features: ['finance_module'] })).toEqual(
      { features: ['finance_module'] },
    );
  });

  it('defaults to no features when the key is missing', () => {
    expect(parseOrganizationMetadata('{"plan":"pro"}')).toEqual({
      features: [],
    });
  });

  it.each([
    ['null', null],
    ['undefined', undefined],
    ['malformed JSON', '{not json'],
    ['features that are not a list', '{"features":"finance_module"}'],
    ['features that are not strings', '{"features":[1,2]}'],
  ])('treats %s as no features', (_label, metadata) => {
    expect(parseOrganizationMetadata(metadata)).toEqual({ features: [] });
  });
});
