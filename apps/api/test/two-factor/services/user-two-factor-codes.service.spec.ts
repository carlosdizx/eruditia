jest.mock('../../../src/two-factor/utils/two-factor-code.util', () => {
  const actual = jest.requireActual<
    typeof import('../../../src/two-factor/utils/two-factor-code.util')
  >('../../../src/two-factor/utils/two-factor-code.util');
  return { ...actual, generateTwoFactorCode: jest.fn() };
});

import 'reflect-metadata';
import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Transaction } from 'sequelize';
import Env from '@common/schemas/env.schema';
import EmailService from '@email/email.service';
import { TWO_FACTOR_CODE_SUBJECT } from '@email/templates/two-factor-code.template';
import UserTwoFactorCodesService from '../../../src/two-factor/services/user-two-factor-codes.service';
import UserTwoFactorCodeRepository from '../../../src/two-factor/repositories/user-two-factor-code.repository';
import {
  generateTwoFactorCode,
  hashTwoFactorCode,
} from '../../../src/two-factor/utils/two-factor-code.util';
import {
  INVALID_TWO_FACTOR_CODE_MESSAGE,
  TWO_FACTOR_CODE_MAX_ATTEMPTS,
  TWO_FACTOR_CODE_TTL_MINUTES,
} from '../../../src/two-factor/constants/two-factor.constant';

const mockedGenerateTwoFactorCode = jest.mocked(generateTwoFactorCode);

describe('UserTwoFactorCodesService', () => {
  let repository: {
    create: jest.Mock;
    findByPk: jest.Mock;
    transaction: jest.Mock;
    invalidatePending: jest.Mock;
    incrementAttempts: jest.Mock;
    consume: jest.Mock;
  };
  let emailService: { main: jest.Mock };
  let configService: { get: jest.Mock };
  let service: UserTwoFactorCodesService;

  const transaction = { id: 'tx' } as unknown as Transaction;
  const now = new Date('2026-10-04T12:00:00Z');
  const user = { id: 'user-id', email: 'ana@example.com', firstName: 'Ana' };

  beforeEach(() => {
    jest.useFakeTimers({ now });

    repository = {
      create: jest.fn((dto: { expiresAt: Date }) =>
        Promise.resolve({ id: 'challenge-id', ...dto }),
      ),
      findByPk: jest.fn(),
      transaction: jest.fn((run: (tx: Transaction) => unknown) =>
        run(transaction),
      ),
      invalidatePending: jest.fn().mockResolvedValue(0),
      incrementAttempts: jest.fn().mockResolvedValue(undefined),
      consume: jest.fn().mockResolvedValue(true),
    };
    emailService = { main: jest.fn().mockResolvedValue(undefined) };
    configService = {
      get: jest.fn((key: string) =>
        key === 'SMTP_USER' ? 'no-reply@eruditia.com' : undefined,
      ),
    };
    mockedGenerateTwoFactorCode.mockReturnValue('012345');

    service = new UserTwoFactorCodesService(
      repository as unknown as UserTwoFactorCodeRepository,
      emailService as unknown as EmailService,
      configService as unknown as ConfigService<Env, true>,
    );
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  describe('issueEmailCode', () => {
    const expiresAt = new Date(
      now.getTime() + TWO_FACTOR_CODE_TTL_MINUTES * 60 * 1000,
    );

    it('returns the challenge id and its expiration, never the code', async () => {
      const result = await service.issueEmailCode(user);

      expect(result).toEqual({ challengeId: 'challenge-id', expiresAt });
      expect(JSON.stringify(result)).not.toContain('012345');
    });

    it('stores only the hash of the code', async () => {
      await service.issueEmailCode(user);

      expect(repository.create).toHaveBeenCalledWith(
        {
          userId: 'user-id',
          codeHash: hashTwoFactorCode('012345'),
          expiresAt,
        },
        { transaction },
      );
    });

    it('invalidates previous pending codes before creating the new one', async () => {
      await service.issueEmailCode(user);

      expect(repository.invalidatePending).toHaveBeenCalledWith(
        'user-id',
        now,
        transaction,
      );
      expect(
        repository.invalidatePending.mock.invocationCallOrder[0],
      ).toBeLessThan(repository.create.mock.invocationCallOrder[0]);
    });

    it('emails the plain code to the user', async () => {
      await service.issueEmailCode(user);

      const [email] = emailService.main.mock.calls[0] as [
        { from: string; to: string; subject: string; html: string },
      ];
      expect(email.from).toBe('no-reply@eruditia.com');
      expect(email.to).toBe('ana@example.com');
      expect(email.subject).toBe(TWO_FACTOR_CODE_SUBJECT);
      expect(email.html).toContain('012345');
      expect(email.html).toContain('Hola, Ana');
    });

    it('runs inside a transaction so a failed email rolls back the code', async () => {
      emailService.main.mockRejectedValue(new Error('smtp down'));

      await expect(service.issueEmailCode(user)).rejects.toThrow('smtp down');
      expect(repository.transaction).toHaveBeenCalledTimes(1);
    });
  });

  describe('verifyCode', () => {
    const record = {
      id: 'challenge-id',
      userId: 'user-id',
      codeHash: hashTwoFactorCode('012345'),
      expiresAt: new Date(now.getTime() + 60 * 1000),
      attempts: 0,
      consumedAt: null as Date | null,
    };

    beforeEach(() => {
      repository.findByPk.mockResolvedValue(record);
    });

    const expectRejected = async (code = '012345') => {
      await expect(service.verifyCode('challenge-id', code)).rejects.toThrow(
        new UnauthorizedException(INVALID_TWO_FACTOR_CODE_MESSAGE),
      );
    };

    it('consumes a valid code and returns its owner', async () => {
      await expect(service.verifyCode('challenge-id', '012345')).resolves.toBe(
        'user-id',
      );
      expect(repository.findByPk).toHaveBeenCalledWith(
        'challenge-id',
        false,
        expect.objectContaining({
          attributes: expect.arrayContaining([
            'codeHash',
            'attempts',
          ]) as unknown,
        }),
      );
      expect(repository.consume).toHaveBeenCalledWith('challenge-id', now);
      expect(repository.incrementAttempts).not.toHaveBeenCalled();
    });

    it('counts a wrong code as a failed attempt', async () => {
      await expectRejected('999999');

      expect(repository.incrementAttempts).toHaveBeenCalledWith('challenge-id');
      expect(repository.consume).not.toHaveBeenCalled();
    });

    it.each([
      ['does not exist', null],
      ['was already used', { ...record, consumedAt: now }],
      ['expired', { ...record, expiresAt: now }],
      [
        'ran out of attempts',
        { ...record, attempts: TWO_FACTOR_CODE_MAX_ATTEMPTS },
      ],
    ])(
      'rejects a challenge that %s even with the right code',
      async (_label, found) => {
        repository.findByPk.mockResolvedValue(found);

        await expectRejected();
        expect(repository.consume).not.toHaveBeenCalled();
        expect(repository.incrementAttempts).not.toHaveBeenCalled();
      },
    );

    it('rejects when a concurrent request consumed the code first', async () => {
      repository.consume.mockResolvedValue(false);

      await expectRejected();
    });

    it('uses the same message for every failure', async () => {
      const wrongCode = await service
        .verifyCode('challenge-id', '999999')
        .catch((error: Error) => error.message);

      repository.findByPk.mockResolvedValue(null);
      const unknownChallenge = await service
        .verifyCode('challenge-id', '012345')
        .catch((error: Error) => error.message);

      expect(wrongCode).toBe(unknownChallenge);
    });
  });
});
