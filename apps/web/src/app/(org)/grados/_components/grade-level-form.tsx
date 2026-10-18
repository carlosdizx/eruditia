'use client';

import { useActionState } from 'react';
import { CircleAlertIcon } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { DialogClose, DialogFooter } from '@/components/ui/dialog';
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';
import { Switch } from '@/components/ui/switch';
import type { GradeLevelFormState, GradeLevelFormValues } from '../types';

type GradeLevelFormProps = {
  mode: 'create' | 'edit';
  action: (
    state: GradeLevelFormState,
    formData: FormData,
  ) => Promise<GradeLevelFormState>;
  initialValues?: GradeLevelFormValues;
  onDone: () => void;
};

// Se monta cada vez que se abre el diálogo, así el estado empieza limpio.
export function GradeLevelForm({
  mode,
  action,
  initialValues = {},
  onDone,
}: GradeLevelFormProps) {
  const [state, formAction, pending] = useActionState(
    async (prev: GradeLevelFormState, formData: FormData) => {
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
        <div className="grid gap-4 sm:grid-cols-[1fr_8rem]">
          <Field>
            <FieldLabel htmlFor="name">Nombre</FieldLabel>
            <Input
              id="name"
              name="name"
              required
              maxLength={50}
              placeholder="Primero"
              defaultValue={values.name ?? ''}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="shortName">Abreviatura</FieldLabel>
            <Input
              id="shortName"
              name="shortName"
              required
              maxLength={10}
              placeholder="1°"
              defaultValue={values.shortName ?? ''}
            />
          </Field>
        </div>

        <Field>
          <FieldLabel htmlFor="sequenceOrder">Orden</FieldLabel>
          <Input
            id="sequenceOrder"
            name="sequenceOrder"
            type="number"
            required
            min={-5}
            max={30}
            step={1}
            className="w-28"
            defaultValue={values.sequenceOrder ?? ''}
          />
          <FieldDescription>
            Al aprobar el año, el estudiante pasa al grado con el orden
            siguiente (Transición = 0, Primero = 1 … Once = 11).
          </FieldDescription>
        </Field>

        <Field orientation="horizontal">
          <FieldContent>
            <FieldLabel htmlFor="isFinalGrade">Último grado</FieldLabel>
            <FieldDescription>
              Al aprobarlo el estudiante se gradúa en lugar de promoverse.
            </FieldDescription>
          </FieldContent>
          <Switch
            id="isFinalGrade"
            name="isFinalGrade"
            defaultChecked={values.isFinalGrade === 'on'}
          />
        </Field>
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
          {mode === 'create' ? 'Crear grado' : 'Guardar cambios'}
        </Button>
      </DialogFooter>
    </form>
  );
}
