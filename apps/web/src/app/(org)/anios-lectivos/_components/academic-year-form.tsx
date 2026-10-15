'use client';

import { useActionState } from 'react';
import { CircleAlertIcon } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { DialogClose, DialogFooter } from '@/components/ui/dialog';
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';
import type {
  AcademicYearFormState,
  AcademicYearFormValues,
  PeriodDraft,
} from '../types';
import { PeriodsEditor } from './periods-editor';

type AcademicYearFormProps = {
  // create: datos + periodos; edit: solo datos; periods: solo periodos.
  mode: 'create' | 'edit' | 'periods';
  action: (
    state: AcademicYearFormState,
    formData: FormData,
  ) => Promise<AcademicYearFormState>;
  initialValues?: AcademicYearFormValues;
  initialPeriods?: PeriodDraft[];
  onDone: () => void;
};

const SUBMIT_LABELS = {
  create: 'Crear año lectivo',
  edit: 'Guardar cambios',
  periods: 'Guardar periodos',
};

// Se monta cada vez que se abre el diálogo, así el estado empieza limpio.
export function AcademicYearForm({
  mode,
  action,
  initialValues = {},
  initialPeriods = [],
  onDone,
}: AcademicYearFormProps) {
  const [state, formAction, pending] = useActionState(
    async (prev: AcademicYearFormState, formData: FormData) => {
      const next = await action(prev, formData);
      if (next.status === 'success') {
        toast.success(next.message);
        onDone();
      }
      return next;
    },
    { status: 'idle' },
  );

  // Tras un error se conserva lo enviado (React reinicia el form).
  const values = state.status === 'error' ? state.values : initialValues;
  const periods =
    state.status === 'error' && state.values.periods
      ? (JSON.parse(state.values.periods) as PeriodDraft[])
      : initialPeriods;

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
        {mode !== 'periods' && (
          <>
            <Field>
              <FieldLabel htmlFor="name">Nombre</FieldLabel>
              <Input
                id="name"
                name="name"
                required
                maxLength={50}
                placeholder="2026"
                defaultValue={values.name ?? ''}
              />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field>
                <FieldLabel htmlFor="startDate">Inicio de clases</FieldLabel>
                <Input
                  id="startDate"
                  name="startDate"
                  type="date"
                  required
                  defaultValue={values.startDate ?? ''}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="endDate">Fin de clases</FieldLabel>
                <Input
                  id="endDate"
                  name="endDate"
                  type="date"
                  required
                  defaultValue={values.endDate ?? ''}
                />
              </Field>
            </div>
          </>
        )}

        {mode !== 'edit' && (
          <FieldSet>
            <FieldLegend variant="label">Periodos evaluativos</FieldLegend>
            <FieldDescription>
              El porcentaje es el peso de cada periodo en el promedio anual;
              deben sumar 100%.
            </FieldDescription>
            <PeriodsEditor initial={periods} />
          </FieldSet>
        )}
      </FieldGroup>

      <DialogFooter>
        <DialogClose
          render={<Button variant="outline" type="button" />}
          disabled={pending}
        >
          Cancelar
        </DialogClose>
        <Button type="submit" disabled={pending}>
          {pending && <Spinner data-icon="inline-start" />}
          {SUBMIT_LABELS[mode]}
        </Button>
      </DialogFooter>
    </form>
  );
}
