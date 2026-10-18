'use client';

import { useState, useTransition } from 'react';
import { REGEXP_ONLY_DIGITS } from 'input-otp';
import { LogOutIcon } from 'lucide-react';
import { ReportCard } from '@/components/grading/report-card';
import { ReportCardPdfMenu } from '@/components/grading/report-card-pdf-menu';
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
  FieldLabel,
} from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from '@/components/ui/input-otp';
import { Spinner } from '@/components/ui/spinner';
import type { ReportCardResponse } from '@/lib/grading/report-card';
import { lookupReportCard, type LookupCredentials } from '../actions';

const PIN_LENGTH = 6;

export function LookupForm({ slug }: { slug: string }) {
  const [documentNumber, setDocumentNumber] = useState('');
  const [accessPin, setAccessPin] = useState('');
  const [error, setError] = useState<string | null>(null);
  // Las credenciales quedan solo en memoria para cambiar de año.
  const [session, setSession] = useState<{
    credentials: LookupCredentials;
    data: ReportCardResponse;
  } | null>(null);
  const [pending, startTransition] = useTransition();

  const consult = (credentials: LookupCredentials) =>
    startTransition(async () => {
      const result = await lookupReportCard(slug, credentials);
      if (!result.ok) {
        setError(result.message);
        setAccessPin('');
        return;
      }
      setError(null);
      setSession({ credentials, data: result.data });
    });

  const exit = () => {
    setSession(null);
    setDocumentNumber('');
    setAccessPin('');
  };

  if (session) {
    const current = session.data.reportCard?.academicYear.id;
    return (
      <div className="flex flex-col gap-4">
        <div className="flex justify-end">
          <Button variant="outline" size="sm" onClick={exit}>
            <LogOutIcon data-icon="inline-start" />
            Salir
          </Button>
        </div>
        <ReportCard
          data={session.data}
          actions={
            session.data.reportCard && (
              <ReportCardPdfMenu
                periods={session.data.reportCard.periods}
                form={{
                  action: `/consulta-notas/${encodeURIComponent(slug)}/pdf`,
                  fields: {
                    documentNumber: session.credentials.documentNumber,
                    accessPin: session.credentials.accessPin,
                    academicYearId: current,
                  },
                }}
              />
            )
          }
          yearSelector={
            session.data.years.length > 1 && (
              <fieldset className="flex flex-wrap items-center gap-2">
                <legend className="sr-only">Años lectivos</legend>
                {session.data.years.map((year) => (
                  <Button
                    key={year.id}
                    size="sm"
                    variant={year.id === current ? 'default' : 'outline'}
                    aria-pressed={year.id === current}
                    disabled={pending}
                    onClick={() =>
                      consult({
                        ...session.credentials,
                        academicYearId: year.id,
                      })
                    }
                  >
                    {year.name}
                  </Button>
                ))}
                {pending && <Spinner className="text-muted-foreground" />}
              </fieldset>
            )
          }
        />
      </div>
    );
  }

  const canSubmit =
    !!documentNumber.trim() && accessPin.length === PIN_LENGTH && !pending;

  return (
    <Card className="mx-auto w-full max-w-sm">
      <CardHeader className="text-center">
        <CardTitle className="text-xl">Consulta de notas</CardTitle>
        <CardDescription>
          Ingresa el documento del estudiante y el PIN de 6 dígitos que te
          entregó el colegio.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            if (canSubmit)
              consult({ documentNumber: documentNumber.trim(), accessPin });
          }}
        >
          <FieldGroup>
            <Field data-invalid={!!error}>
              <FieldLabel htmlFor="documentNumber">
                Documento del estudiante
              </FieldLabel>
              <Input
                id="documentNumber"
                inputMode="numeric"
                autoComplete="off"
                maxLength={30}
                value={documentNumber}
                onChange={(event) => setDocumentNumber(event.target.value)}
                aria-invalid={!!error}
                required
              />
            </Field>
            <Field data-invalid={!!error}>
              <FieldLabel htmlFor="accessPin">PIN</FieldLabel>
              <InputOTP
                id="accessPin"
                containerClassName="gap-2"
                maxLength={PIN_LENGTH}
                pattern={REGEXP_ONLY_DIGITS}
                inputMode="numeric"
                autoComplete="off"
                aria-invalid={!!error}
                value={accessPin}
                onChange={setAccessPin}
                disabled={pending}
              >
                <InputOTPGroup>
                  {Array.from({ length: PIN_LENGTH }, (_, index) => (
                    <InputOTPSlot
                      key={index}
                      index={index}
                      className="size-10 text-lg"
                      aria-invalid={!!error}
                    />
                  ))}
                </InputOTPGroup>
              </InputOTP>
              <FieldError>{error}</FieldError>
              <FieldDescription>
                ¿No tienes PIN? Pídelo en la secretaría del colegio.
              </FieldDescription>
            </Field>
            <Field>
              <Button type="submit" disabled={!canSubmit}>
                {pending && <Spinner data-icon="inline-start" />}
                {pending ? 'Consultando…' : 'Ver boletín'}
              </Button>
            </Field>
          </FieldGroup>
        </form>
      </CardContent>
    </Card>
  );
}
