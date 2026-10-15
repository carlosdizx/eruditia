import { generateAccessPin } from '../../../src/students/utils/access-pin.util';
import { verifyPassword } from '@common/utils/password.util';

describe('generateAccessPin', () => {
  it('returns a 6 digit PIN and a hash that verifies it', async () => {
    const { accessPin, accessPinHash } = await generateAccessPin();

    expect(accessPin).toMatch(/^\d{6}$/);
    expect(accessPinHash).not.toContain(accessPin);
    await expect(verifyPassword(accessPin, accessPinHash)).resolves.toBe(true);
  });
});
