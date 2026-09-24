import observeSchema from '@common/schemas/observe.schema';

const validEnv = {
  OBSERVE_APP_KEY: 'key',
  OBSERVE_APP_SECRET: 'secret',
  OBSERVE_SERVICE_ID: 'service',
};

describe('observeSchema', () => {
  it('accepts a valid configuration', () => {
    expect(observeSchema.parse(validEnv)).toEqual(validEnv);
  });

  it.each(Object.keys(validEnv))('rejects a missing %s', (key) => {
    const env: Record<string, string> = { ...validEnv };
    delete env[key];

    expect(observeSchema.safeParse(env).success).toBe(false);
  });

  it.each(Object.keys(validEnv))('rejects an empty %s', (key) => {
    expect(observeSchema.safeParse({ ...validEnv, [key]: '' }).success).toBe(
      false,
    );
  });
});
