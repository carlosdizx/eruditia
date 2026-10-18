'use client';

import { useState, useTransition } from 'react';
import { SearchIcon } from 'lucide-react';
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Spinner } from '@/components/ui/spinner';
import type { ReportCardResponse } from '@/lib/grading/report-card';
import { lookupReportCard, type LookupCredentials } from '../actions';

export type PortalYear = { id: string; name: string; isActive: boolean };

// El acudiente puede escribir "1.001.234 567": se consulta sin puntos, comas
// ni espacios.
const cleanDocument = (value: string) => value.replace(/[\s.,]/g, '');

export function LookupForm({
  slug,
  years,
}: {
  slug: string;
  years: PortalYear[];
}) {
  const [academicYearId, setAcademicYearId] = useState(
    () => (years.find(({ isActive }) => isActive) ?? years[0])?.id ?? '',
  );
  const [documentNumber, setDocumentNumber] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{
    credentials: LookupCredentials;
    data: ReportCardResponse;
  } | null>(null);
  const [pending, startTransition] = useTransition();

  const consult = (credentials: LookupCredentials) =>
    startTransition(async () => {
      const response = await lookupReportCard(slug, credentials);
      if (!response.ok) {
        setError(response.message);
        return;
      }
      setError(null);
      setAcademicYearId(credentials.academicYearId);
      setResult({ credentials, data: response.data });
    });

  const changeYear = (yearId: string) =>
    result && consult({ ...result.credentials, academicYearId: yearId });

  if (result) {
    const { data, credentials } = result;
    const requested = years.find(({ id }) => id === credentials.academicYearId);
    const yearButtons = (current?: string) => (
      <fieldset className="flex flex-wrap items-center gap-2">
        <legend className="sr-only">Años lectivos con matrícula</legend>
        {data.years.map((year) => (
          <Button
            key={year.id}
            size="lg"
            variant={year.id === current ? 'default' : 'outline'}
            aria-pressed={year.id === current}
            disabled={pending}
            onClick={() => changeYear(year.id)}
          >
            {year.name}
          </Button>
        ))}
        {pending && <Spinner className="text-muted-foreground" />}
      </fieldset>
    );

    return (
      <div className="flex flex-col gap-4">
        <div className="flex justify-end">
          <Button variant="outline" size="lg" onClick={() => setResult(null)}>
            <SearchIcon data-icon="inline-start" />
            Nueva consulta
          </Button>
        </div>
        {data.reportCard ? (
          <ReportCard
            data={data}
            actions={
              <ReportCardPdfMenu
                prominent
                label="Descargar Boletín en PDF"
                periods={data.reportCard.periods}
                href={`/consulta-notas/${encodeURIComponent(slug)}/pdf?${new URLSearchParams(
                  {
                    anio: credentials.academicYearId,
                    documento: credentials.documentNumber,
                  },
                )}`}
              />
            }
            yearSelector={
              data.years.length > 1 &&
              yearButtons(data.reportCard.academicYear.id)
            }
          />
        ) : (
          <Card className="mx-auto w-full max-w-lg">
            <CardHeader>
              <CardTitle className="text-lg">
                {data.student.firstName} {data.student.lastName} no tiene
                matrícula en {requested?.name ?? 'ese año escolar'}
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3 text-base">
              {data.years.length ? (
                <>
                  <p>Registra matrícula en estos años. Toca uno para verlo:</p>
                  {yearButtons()}
                </>
              ) : (
                <p>Aún no registra matrículas en el colegio.</p>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    );
  }

  const cleaned = cleanDocument(documentNumber);
  const canSubmit = !!academicYearId && !!cleaned && !pending;

  return (
    <Card className="mx-auto w-full max-w-md">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl">Consulta de notas</CardTitle>
        <CardDescription className="text-base">
          Mira el boletín del estudiante con solo dos datos.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            if (canSubmit) consult({ academicYearId, documentNumber: cleaned });
          }}
        >
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="academicYearId" className="text-base">
                1. Selecciona el año escolar
              </FieldLabel>
              <Select
                items={years.map(({ id, name }) => ({
                  value: id,
                  label: name,
                }))}
                value={academicYearId}
                onValueChange={(value) => setAcademicYearId(String(value))}
                disabled={pending}
              >
                <SelectTrigger
                  id="academicYearId"
                  className="w-full text-base data-[size=default]:h-12"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {years.map((year) => (
                    <SelectItem
                      key={year.id}
                      value={year.id}
                      className="text-base"
                    >
                      {year.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field data-invalid={!!error}>
              <FieldLabel htmlFor="documentNumber" className="text-base">
                2. Escribe el documento del estudiante (sin puntos ni espacios)
              </FieldLabel>
              <Input
                id="documentNumber"
                inputMode="numeric"
                autoComplete="off"
                placeholder="Ej: 1001234567"
                maxLength={40}
                className="h-12 text-lg"
                value={documentNumber}
                onChange={(event) => setDocumentNumber(event.target.value)}
                aria-invalid={!!error}
                disabled={pending}
                required
              />
              <FieldError className="text-base">{error}</FieldError>
              <FieldDescription>
                Es el número de la tarjeta de identidad o registro civil del
                estudiante.
              </FieldDescription>
            </Field>
            <Field>
              <Button
                type="submit"
                size="lg"
                className="h-12 text-base"
                disabled={!canSubmit}
              >
                {pending ? (
                  <Spinner data-icon="inline-start" />
                ) : (
                  <SearchIcon data-icon="inline-start" />
                )}
                {pending ? 'Consultando…' : 'Ver boletín'}
              </Button>
            </Field>
          </FieldGroup>
        </form>
      </CardContent>
    </Card>
  );
}
