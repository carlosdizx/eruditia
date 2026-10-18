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
} from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';
import type { SubjectFormState, SubjectFormValues } from '../types';

// Se monta cada vez que se abre el diálogo, así el estado empieza limpio.
export function SubjectForm({
  mode,
  action,
  areas,
  initialValues = {},
  onDone,
}: {
  mode: 'create' | 'edit';
  action: (
    state: SubjectFormState,
    formData: FormData,
  ) => Promise<SubjectFormState>;
  // Áreas ya usadas, como sugerencias.
  areas: string[];
  initialValues?: SubjectFormValues;
  onDone: () => void;
}) {
  const [state, formAction, pending] = useActionState(
    async (prev: SubjectFormState, formData: FormData) => {
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
              maxLength={100}
              placeholder="Matemáticas"
              defaultValue={values.name ?? ''}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="code">Código</FieldLabel>
            <Input
              id="code"
              name="code"
              required
              maxLength={20}
              pattern="[A-Za-z0-9\-]{1,20}"
              title="Solo letras, números y guiones"
              placeholder="MAT"
              className="uppercase"
              defaultValue={values.code ?? ''}
            />
          </Field>
        </div>
        <Field>
          <FieldLabel htmlFor="areaName">Área</FieldLabel>
          <Input
            id="areaName"
            name="areaName"
            maxLength={100}
            list="subject-areas"
            placeholder="Opcional, ej. Humanidades"
            defaultValue={values.areaName ?? ''}
          />
          <datalist id="subject-areas">
            {areas.map((area) => (
              <option key={area} value={area}>
                {area}
              </option>
            ))}
          </datalist>
          <FieldDescription>
            Agrupa materias del mismo área obligatoria (ej. Lengua Castellana e
            Inglés en Humanidades).
          </FieldDescription>
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
          {mode === 'create' ? 'Crear materia' : 'Guardar cambios'}
        </Button>
      </DialogFooter>
    </form>
  );
}
