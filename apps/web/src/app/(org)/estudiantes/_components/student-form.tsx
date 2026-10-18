'use client';

import { useActionState, useState } from 'react';
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
  FieldLegend,
  FieldSet,
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
import {
  DOCUMENT_TYPES,
  STUDENT_STATUSES,
  type StudentFormState,
  type StudentFormValues,
} from '../types';

type StudentFormProps = {
  mode: 'create' | 'edit';
  action: (
    state: StudentFormState,
    formData: FormData,
  ) => Promise<StudentFormState>;
  initialValues?: StudentFormValues;
  onDone: (result: Extract<StudentFormState, { status: 'success' }>) => void;
};

const today = () => new Date().toISOString().slice(0, 10);

// Se monta cada vez que se abre el diálogo, así el estado empieza limpio.
export function StudentForm({
  mode,
  action,
  initialValues = {},
  onDone,
}: StudentFormProps) {
  const [state, formAction, pending] = useActionState(
    async (prev: StudentFormState, formData: FormData) => {
      const next = await action(prev, formData);
      if (next.status === 'success') {
        toast.success(next.message);
        onDone(next);
      }
      return next;
    },
    { status: 'idle' },
  );

  // Tras un error se conserva lo enviado (React reinicia el form).
  const values = state.status === 'error' ? state.values : initialValues;
  const [createAccount, setCreateAccount] = useState(
    values.createAccount === 'on',
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

      <FieldGroup>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field>
            <FieldLabel htmlFor="firstName">Nombres</FieldLabel>
            <Input
              id="firstName"
              name="firstName"
              required
              maxLength={100}
              defaultValue={values.firstName ?? ''}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="lastName">Apellidos</FieldLabel>
            <Input
              id="lastName"
              name="lastName"
              required
              maxLength={100}
              defaultValue={values.lastName ?? ''}
            />
          </Field>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field>
            <FieldLabel htmlFor="documentType">Tipo de documento</FieldLabel>
            <Select
              name="documentType"
              items={DOCUMENT_TYPES}
              defaultValue={values.documentType || null}
              required
            >
              <SelectTrigger id="documentType" className="w-full">
                <SelectValue placeholder="Selecciona un tipo" />
              </SelectTrigger>
              <SelectContent>
                {DOCUMENT_TYPES.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field>
            <FieldLabel htmlFor="documentNumber">
              Número de documento
            </FieldLabel>
            <Input
              id="documentNumber"
              name="documentNumber"
              required
              maxLength={30}
              pattern="[A-Za-z0-9\-]{3,30}"
              title="Solo letras, números y guiones"
              defaultValue={values.documentNumber ?? ''}
            />
          </Field>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field>
            <FieldLabel htmlFor="studentCode">Código estudiantil</FieldLabel>
            <Input
              id="studentCode"
              name="studentCode"
              maxLength={30}
              pattern="[A-Za-z0-9\-]{1,30}"
              title="Solo letras, números y guiones"
              placeholder="Opcional"
              defaultValue={values.studentCode ?? ''}
            />
            <FieldDescription>
              {mode === 'create'
                ? 'Si lo dejas vacío, se usa el número de documento.'
                : 'Si lo dejas vacío, se conserva el actual.'}
            </FieldDescription>
          </Field>
          <Field>
            <FieldLabel htmlFor="birthDate">Fecha de nacimiento</FieldLabel>
            <Input
              id="birthDate"
              name="birthDate"
              type="date"
              max={today()}
              defaultValue={values.birthDate ?? ''}
            />
          </Field>
        </div>

        {mode === 'edit' && (
          <Field>
            <FieldLabel htmlFor="status">Estado</FieldLabel>
            <Select
              name="status"
              items={STUDENT_STATUSES}
              defaultValue={values.status || 'active'}
              required
            >
              <SelectTrigger id="status" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STUDENT_STATUSES.map((status) => (
                  <SelectItem key={status.value} value={status.value}>
                    {status.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        )}

        {mode === 'create' && (
          <FieldSet>
            <Field orientation="horizontal">
              <FieldContent>
                <FieldLabel htmlFor="createAccount">
                  Crear cuenta de acceso (Login) para este estudiante
                </FieldLabel>
                <FieldDescription>
                  {createAccount
                    ? 'Iniciará sesión con su correo; le enviaremos una contraseña temporal.'
                    : 'Sin cuenta, sus notas se consultan en el portal público con el año escolar y su documento.'}
                </FieldDescription>
              </FieldContent>
              <Switch
                id="createAccount"
                name="createAccount"
                checked={createAccount}
                onCheckedChange={setCreateAccount}
              />
            </Field>
            {createAccount && (
              <Field>
                <FieldLabel htmlFor="email">Correo del estudiante</FieldLabel>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  required
                  placeholder="estudiante@colegio.edu"
                  defaultValue={values.email ?? ''}
                />
              </Field>
            )}
          </FieldSet>
        )}

        <FieldSet>
          <FieldLegend variant="label">Acudiente</FieldLegend>
          <FieldDescription>
            Opcional. Su correo se usará para enviar boletines.
          </FieldDescription>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="guardianName">Nombre completo</FieldLabel>
              <Input
                id="guardianName"
                name="guardianName"
                maxLength={200}
                defaultValue={values.guardianName ?? ''}
              />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field>
                <FieldLabel htmlFor="guardianPhone">
                  Teléfono / WhatsApp
                </FieldLabel>
                <Input
                  id="guardianPhone"
                  name="guardianPhone"
                  type="tel"
                  maxLength={20}
                  pattern="\+?[0-9 ]{7,20}"
                  title="Solo números, espacios y un + inicial"
                  defaultValue={values.guardianPhone ?? ''}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="guardianEmail">Correo</FieldLabel>
                <Input
                  id="guardianEmail"
                  name="guardianEmail"
                  type="email"
                  defaultValue={values.guardianEmail ?? ''}
                />
              </Field>
            </div>
          </FieldGroup>
        </FieldSet>
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
          {mode === 'create' ? 'Matricular' : 'Guardar cambios'}
        </Button>
      </DialogFooter>
    </form>
  );
}
