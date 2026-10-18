'use client';

import { useActionState, useEffect, useRef, useState } from 'react';
import { REGEXP_ONLY_DIGITS } from 'input-otp';
import { ArrowLeftIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
} from '@/components/ui/field';
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSeparator,
  InputOTPSlot,
} from '@/components/ui/input-otp';
import { Spinner } from '@/components/ui/spinner';
import { verifyOtp, type VerifyOtpState } from '../actions';
import type { Challenge } from './credentials-form';

const OTP_LENGTH = 6;

type OtpFormProps = {
  challenge: Challenge;
  onBack: () => void;
};

const useSecondsLeft = (expiresAt: string) => {
  const deadline = new Date(expiresAt).getTime();
  const [secondsLeft, setSecondsLeft] = useState(() =>
    Math.max(0, Math.ceil((deadline - Date.now()) / 1000)),
  );

  useEffect(() => {
    const id = setInterval(() => {
      const next = Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
      setSecondsLeft(next);
      if (next === 0) clearInterval(id);
    }, 1000);

    return () => clearInterval(id);
  }, [deadline]);

  return secondsLeft;
};

const formatCountdown = (seconds: number) =>
  `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;

export function OtpForm({ challenge, onBack }: OtpFormProps) {
  const formRef = useRef<HTMLFormElement>(null);
  const [code, setCode] = useState('');
  const secondsLeft = useSecondsLeft(challenge.expiresAt);
  const expired = secondsLeft === 0;

  const [state, formAction, pending] = useActionState(
    async (prev: VerifyOtpState, formData: FormData) => {
      const next = await verifyOtp(prev, formData);
      if (next.status === 'error') setCode('');
      return next;
    },
    { status: 'idle' },
  );

  const error = expired
    ? 'El código expiró. Vuelve a iniciar sesión para recibir uno nuevo.'
    : state.status === 'error'
      ? state.message
      : null;

  const slotClassName = 'size-11 text-xl';

  return (
    <Card>
      <CardHeader className="text-center">
        <CardTitle className="text-xl">Revisa tu correo</CardTitle>
        <CardDescription>
          Enviamos un código de {OTP_LENGTH} dígitos a{' '}
          <span className="text-foreground font-medium">{challenge.email}</span>
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form ref={formRef} action={formAction}>
          <input
            type="hidden"
            name="challengeId"
            value={challenge.challengeId}
          />
          <FieldGroup>
            <Field data-invalid={!!error} className="items-center">
              <InputOTP
                containerClassName="justify-center gap-2"
                name="code"
                maxLength={OTP_LENGTH}
                pattern={REGEXP_ONLY_DIGITS}
                inputMode="numeric"
                autoComplete="one-time-code"
                aria-label="Código de verificación"
                aria-invalid={!!error}
                value={code}
                onChange={setCode}
                onComplete={() => formRef.current?.requestSubmit()}
                disabled={pending || expired}
                autoFocus
                required
              >
                <InputOTPGroup>
                  {[0, 1, 2].map((index) => (
                    <InputOTPSlot
                      key={index}
                      index={index}
                      className={slotClassName}
                      aria-invalid={!!error}
                    />
                  ))}
                </InputOTPGroup>
                <InputOTPSeparator />
                <InputOTPGroup>
                  {[3, 4, 5].map((index) => (
                    <InputOTPSlot
                      key={index}
                      index={index}
                      className={slotClassName}
                      aria-invalid={!!error}
                    />
                  ))}
                </InputOTPGroup>
              </InputOTP>
              <FieldError className="text-center">{error}</FieldError>
              {!expired && (
                <FieldDescription className="text-center">
                  El código vence en{' '}
                  <span className="font-medium tabular-nums">
                    {formatCountdown(secondsLeft)}
                  </span>
                </FieldDescription>
              )}
            </Field>
            <Field>
              <Button
                type="submit"
                disabled={pending || expired || code.length < OTP_LENGTH}
              >
                {pending && <Spinner data-icon="inline-start" />}
                {pending ? 'Verificando…' : 'Verificar'}
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={onBack}
                disabled={pending}
              >
                <ArrowLeftIcon data-icon="inline-start" />
                Usar otra cuenta
              </Button>
            </Field>
          </FieldGroup>
        </form>
      </CardContent>
    </Card>
  );
}
