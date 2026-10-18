import extractBearerToken from '@auth/utils/bearer-token.util';

describe('extractBearerToken', () => {
  it('extracts the token from a Bearer header', () => {
    expect(extractBearerToken('Bearer abc123')).toBe('abc123');
  });

  it('accepts the scheme in any case', () => {
    expect(extractBearerToken('bearer abc123')).toBe('abc123');
    expect(extractBearerToken('BEARER abc123')).toBe('abc123');
  });

  it('tolerates extra whitespace', () => {
    expect(extractBearerToken('  Bearer   abc123  ')).toBe('abc123');
  });

  it.each([undefined, '', '   '])('returns null for %p', (header) => {
    expect(extractBearerToken(header)).toBeNull();
  });

  it.each(['Basic abc123', 'Token abc123', 'abc123'])(
    'returns null for another scheme: "%s"',
    (header) => {
      expect(extractBearerToken(header)).toBeNull();
    },
  );

  it('returns null when the token is missing', () => {
    expect(extractBearerToken('Bearer')).toBeNull();
  });

  it('returns null when there is more than one token', () => {
    expect(extractBearerToken('Bearer abc 123')).toBeNull();
  });
});
