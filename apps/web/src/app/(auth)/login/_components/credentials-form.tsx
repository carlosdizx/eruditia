'use client';

import { useActionState } from 'react';
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
  FieldError,
  FieldGroup,
  FieldLabel,
} from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';
import { login, type LoginState } from '../actions';

export type Challenge = Extract<LoginState, { status: 'challenge' }>;

type CredentialsFormProps = {
  defaultEmail: string;
  onChallenge: (challenge: Challenge) => void;
};

export function CredentialsForm({
  defaultEmail,
  onChallenge,
}: CredentialsFormProps) {
  const [state, formAction, pending] = useActionState(
    async (prev: LoginState, formData: FormData) => {
      const next = await login(prev, formData);
      if (next.status === 'challenge') onChallenge(next);
      return next;
    },
    { status: 'idle' },
  );

  const error = state.status === 'error' ? state.message : null;
  const email = state.status === 'error' ? state.email : defaultEmail;

  return (
    <Card>
      <CardHeader className="text-center">
        <CardTitle className="text-xl">Bienvenido de nuevo</CardTitle>
        <CardDescription>Ingresa con tu correo y contraseña</CardDescription>
      </CardHeader>
      <CardContent>
        <form action={formAction}>
          <FieldGroup>
            <Field data-invalid={!!error}>
              <FieldLabel htmlFor="email">Correo</FieldLabel>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="nombre@empresa.com"
                autoComplete="username"
                defaultValue={email}
                aria-invalid={!!error}
                required
                autoFocus
              />
            </Field>
            <Field data-invalid={!!error}>
              <FieldLabel htmlFor="password">Contraseña</FieldLabel>
              <Input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                maxLength={128}
                aria-invalid={!!error}
                required
              />
              <FieldError>{error}</FieldError>
            </Field>
            <Field>
              <Button type="submit" disabled={pending}>
                {pending && <Spinner data-icon="inline-start" />}
                {pending ? 'Ingresando…' : 'Iniciar sesión'}
              </Button>
            </Field>
          </FieldGroup>
        </form>
      </CardContent>
    </Card>
  );
}
