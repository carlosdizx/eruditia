import logLevelSchema from '@common/schemas/log-level.schema';

describe('logLevelSchema', () => {
  it.each(['log', 'error', 'warn', 'debug', 'verbose', 'fatal'])(
    'accepts "%s"',
    (level) => {
      expect(logLevelSchema.parse(level)).toBe(level);
    },
  );

  it.each(['info', 'LOG', '', 'trace'])('rejects "%s"', (level) => {
    expect(logLevelSchema.safeParse(level).success).toBe(false);
  });

  it('rejects non-string values', () => {
    expect(logLevelSchema.safeParse(undefined).success).toBe(false);
    expect(logLevelSchema.safeParse(1).success).toBe(false);
  });
});
