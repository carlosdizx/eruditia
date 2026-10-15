import { randomInt } from 'crypto';
import { hashPassword } from '@common/utils/password.util';

export const ACCESS_PIN_LENGTH = 6;

// El PIN en claro solo se devuelve una vez, al generarlo; se guarda su hash.
export const generateAccessPin = async () => {
  const accessPin = randomInt(0, 10 ** ACCESS_PIN_LENGTH)
    .toString()
    .padStart(ACCESS_PIN_LENGTH, '0');

  return { accessPin, accessPinHash: await hashPassword(accessPin) };
};
