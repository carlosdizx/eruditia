'use client';

import { useActionState } from 'react';
import { CircleAlertIcon } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { DialogClose, DialogFooter } from '@/components/ui/dialog';
import { Field, FieldDescription, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';
import type { StudentFormState } from '../types';

// Se monta cada vez que se abre el diálogo, así el estado empieza limpio.
export function LinkAccountForm({
  action,
  onDone,
}: {
  action: (
    state: StudentFormState,
    formData: FormData,
  ) => Promise<StudentFormState>;
  onDone: () => void;
}) {
  const [state, formAction, pending] = useActionState(
    async (prev: StudentFormState, formData: FormData) => {
      const next = await action(prev, formData);
      if (next.status === 'success') {
        toast.success(next.message);
        onDone();
      }
      return next;
    },
    { status: 'idle' },
  );

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

      <Field>
        <FieldLabel htmlFor="email">Correo del estudiante</FieldLabel>
        <Input
          id="email"
          name="email"
          type="email"
          required
          placeholder="estudiante@colegio.edu"
          defaultValue={state.status === 'error' ? state.values.email : ''}
        />
        <FieldDescription>
          Si no existe, se crea una cuenta con rol estudiante y le enviamos una
          contraseña temporal. Si ya es una cuenta de estudiante de tu colegio,
          se vincula.
        </FieldDescription>
      </Field>

      <DialogFooter>
        <DialogClose
          render={<Button variant="outline" type="button" />}
          disabled={pending}
        >
          Cancelar
        </DialogClose>
        <Button type="submit" disabled={pending}>
          {pending && <Spinner data-icon="inline-start" />}
          Vincular
        </Button>
      </DialogFooter>
    </form>
  );
}
