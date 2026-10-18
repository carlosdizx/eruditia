'use client';

import { useActionState, useState } from 'react';
import { CircleAlertIcon } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  Field,
  FieldContent,
  FieldDescription,
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
import { Switch } from '@/components/ui/switch';
import type { GradingScale } from '@/lib/grading/scale';
import { saveGradingScale } from '../actions';
import type { GradingScaleFormState, GradingScaleFormValues } from '../types';

const DECIMAL_OPTIONS = [
  { value: '1', label: '1 decimal (ej. 3.5)' },
  { value: '2', label: '2 decimales (ej. 3.75)' },
];

const toValues = ({
  minScore,
  maxScore,
  passingScore,
  decimalPlaces,
  maxFailedSubjects,
  failByAverage,
  showRankInReportCard,
}: GradingScale): GradingScaleFormValues => ({
  failByAverage: failByAverage ? 'on' : '',
  showRankInReportCard: showRankInReportCard ? 'on' : '',
  minScore: minScore.toFixed(decimalPlaces),
  maxScore: maxScore.toFixed(decimalPlaces),
  passingScore: passingScore.toFixed(decimalPlaces),
  decimalPlaces: String(decimalPlaces),
  maxFailedSubjects: maxFailedSubjects?.toString() ?? '',
});

// Barra de min a max: en rojo lo que reprueba, en verde lo que aprueba.
function ScalePreview({ values }: { values: GradingScaleFormValues }) {
  const min = Number(values.minScore);
  const max = Number(values.maxScore);
  const passing = Number(values.passingScore);
  const decimals = Number(values.decimalPlaces) || 1;

  if (
    [min, max, passing].some(Number.isNaN) ||
    min >= max ||
    passing <= min ||
    passing > max
  )
    return (
      <p className="text-muted-foreground text-sm">
        Completa una escala válida para ver la vista previa.
      </p>
    );

  const failing = ((passing - min) / (max - min)) * 100;
  const lastFailing = passing - 10 ** -decimals;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex h-3 overflow-hidden rounded-full">
        <div className="bg-destructive/70" style={{ width: `${failing}%` }} />
        <div className="flex-1 bg-emerald-500/70" />
      </div>
      <div className="text-muted-foreground flex justify-between text-xs tabular-nums">
        <span>{min.toFixed(decimals)}</span>
        <span>{passing.toFixed(decimals)}</span>
        <span>{max.toFixed(decimals)}</span>
      </div>
      <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm">
        <span className="text-destructive">
          Reprueba: {min.toFixed(decimals)} a {lastFailing.toFixed(decimals)}
        </span>
        <span className="text-emerald-600 dark:text-emerald-400">
          Aprueba: {passing.toFixed(decimals)} a {max.toFixed(decimals)}
        </span>
      </div>
    </div>
  );
}

export function GradingScaleForm({ scale }: { scale: GradingScale }) {
  const [values, setValues] = useState(() => toValues(scale));

  const [state, formAction, pending] = useActionState(
    async (prev: GradingScaleFormState, formData: FormData) => {
      const next = await saveGradingScale(prev, formData);
      if (next.status === 'success') toast.success(next.message);
      else if (next.status === 'error') setValues(next.values);
      return next;
    },
    { status: 'idle' },
  );

  const step = values.decimalPlaces === '2' ? '0.01' : '0.1';
  const change =
    (field: keyof GradingScaleFormValues) =>
    (event: React.ChangeEvent<HTMLInputElement>) =>
      setValues((current) => ({ ...current, [field]: event.target.value }));

  return (
    <form action={formAction} className="flex flex-col gap-6">
      {state.status === 'error' && (
        <div
          role="alert"
          className="border-destructive/30 bg-destructive/10 text-destructive flex items-start gap-2 rounded-lg border px-3 py-2 text-sm"
        >
          <CircleAlertIcon className="mt-0.5 size-4 shrink-0" />
          {state.message}
        </div>
      )}

      <FieldGroup>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field>
            <FieldLabel htmlFor="minScore">Nota mínima</FieldLabel>
            <Input
              id="minScore"
              name="minScore"
              type="number"
              required
              min={0}
              max={100}
              step={step}
              value={values.minScore ?? ''}
              onChange={change('minScore')}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="passingScore">Nota aprobatoria</FieldLabel>
            <Input
              id="passingScore"
              name="passingScore"
              type="number"
              required
              min={0}
              max={100}
              step={step}
              value={values.passingScore ?? ''}
              onChange={change('passingScore')}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="maxScore">Nota máxima</FieldLabel>
            <Input
              id="maxScore"
              name="maxScore"
              type="number"
              required
              min={0}
              max={100}
              step={step}
              value={values.maxScore ?? ''}
              onChange={change('maxScore')}
            />
          </Field>
        </div>

        <Field>
          <FieldLabel htmlFor="decimalPlaces">Decimales</FieldLabel>
          <Select
            name="decimalPlaces"
            items={DECIMAL_OPTIONS}
            value={values.decimalPlaces ?? '1'}
            onValueChange={(value) =>
              setValues((current) => ({
                ...current,
                decimalPlaces: String(value),
              }))
            }
            required
          >
            <SelectTrigger id="decimalPlaces" className="w-full sm:w-64">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {DECIMAL_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <FieldDescription>
            Cuántos decimales se pueden digitar en las planillas y se muestran
            en los boletines.
          </FieldDescription>
        </Field>

        <Field>
          <FieldLabel htmlFor="maxFailedSubjects">
            Materias perdidas para reprobar el año
          </FieldLabel>
          <Input
            id="maxFailedSubjects"
            name="maxFailedSubjects"
            type="number"
            min={1}
            max={50}
            step={1}
            placeholder="No aplica"
            className="sm:w-64"
            value={values.maxFailedSubjects ?? ''}
            onChange={change('maxFailedSubjects')}
          />
          <FieldDescription>
            En la promoción anual se sugiere repetir el grado si el estudiante
            pierde esta cantidad de materias o más (1: con una sola materia
            perdida repite). Déjalo vacío si las materias perdidas no deben
            hacer repetir el año.
          </FieldDescription>
        </Field>

        <Field orientation="horizontal">
          <FieldContent>
            <FieldLabel htmlFor="failByAverage">
              También reprobar por promedio general
            </FieldLabel>
            <FieldDescription>
              Si se activa, también repite quien tenga un promedio general menor
              a la nota aprobatoria, aunque no pierda materias.
            </FieldDescription>
          </FieldContent>
          <Switch
            id="failByAverage"
            name="failByAverage"
            checked={values.failByAverage === 'on'}
            onCheckedChange={(checked) =>
              setValues((current) => ({
                ...current,
                failByAverage: checked ? 'on' : '',
              }))
            }
          />
        </Field>

        <Field orientation="horizontal">
          <FieldContent>
            <FieldLabel htmlFor="showRankInReportCard">
              Mostrar el puesto en el boletín
            </FieldLabel>
            <FieldDescription>
              El boletín del estudiante (con su cuenta o en el portal público)
              muestra su puesto en el salón según el promedio acumulado del año,
              por ejemplo «Puesto 3 de 28».
            </FieldDescription>
          </FieldContent>
          <Switch
            id="showRankInReportCard"
            name="showRankInReportCard"
            checked={values.showRankInReportCard === 'on'}
            onCheckedChange={(checked) =>
              setValues((current) => ({
                ...current,
                showRankInReportCard: checked ? 'on' : '',
              }))
            }
          />
        </Field>

        <Field>
          <FieldLabel>Vista previa</FieldLabel>
          <ScalePreview values={values} />
        </Field>
      </FieldGroup>

      <div className="flex justify-end">
        <Button type="submit" disabled={pending}>
          {pending && <Spinner data-icon="inline-start" />}
          Guardar escala
        </Button>
      </div>
    </form>
  );
}
