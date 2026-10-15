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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Spinner } from '@/components/ui/spinner';
import { Switch } from '@/components/ui/switch';
import type { AssignableRole, UserFormState, UserFormValues } from '../types';

type UserFormProps = {
  mode: 'create' | 'edit';
  action: (state: UserFormState, formData: FormData) => Promise<UserFormState>;
  roles: AssignableRole[];
  initialValues?: UserFormValues;
  // La propia cuenta no puede cambiar su rol ni desactivarse.
  isSelf?: boolean;
  onDone: () => void;
};

// Se monta cada vez que se abre el diálogo, así el estado empieza limpio.
export function UserForm({
  mode,
  action,
  roles,
  initialValues = {},
  isSelf = false,
  onDone,
}: UserFormProps) {
  const [state, formAction, pending] = useActionState(
    async (prev: UserFormState, formData: FormData) => {
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
  const roleItems = roles.map((role) => ({
    value: role.id,
    label: role.labelEs,
  }));

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
            <FieldLabel htmlFor="firstName">Nombre</FieldLabel>
            <Input
              id="firstName"
              name="firstName"
              required
              maxLength={100}
              defaultValue={values.firstName ?? ''}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="lastName">Apellido</FieldLabel>
            <Input
              id="lastName"
              name="lastName"
              required
              maxLength={100}
              defaultValue={values.lastName ?? ''}
            />
          </Field>
        </div>

        <Field>
          <FieldLabel htmlFor="email">Correo</FieldLabel>
          <Input
            id="email"
            name={mode === 'create' ? 'email' : undefined}
            type="email"
            required
            readOnly={mode === 'edit'}
            disabled={mode === 'edit'}
            placeholder="nombre@colegio.edu"
            defaultValue={values.email ?? ''}
          />
          <FieldDescription>
            {mode === 'create'
              ? 'Le enviaremos una contraseña temporal a este correo.'
              : 'El correo no se puede cambiar.'}
          </FieldDescription>
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field>
            <FieldLabel htmlFor="documentNumber">Documento</FieldLabel>
            <Input
              id="documentNumber"
              name="documentNumber"
              maxLength={30}
              pattern="[A-Za-z0-9\-]{3,30}"
              title="Solo letras, números y guiones"
              placeholder="Opcional"
              defaultValue={values.documentNumber ?? ''}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="phone">Teléfono</FieldLabel>
            <Input
              id="phone"
              name="phone"
              type="tel"
              maxLength={20}
              pattern="\+?[0-9 ]{7,20}"
              title="Solo números, espacios y un + inicial"
              placeholder="Opcional"
              defaultValue={values.phone ?? ''}
            />
          </Field>
        </div>

        <Field>
          <FieldLabel htmlFor="roleId">Rol</FieldLabel>
          <Select
            name="roleId"
            items={roleItems}
            defaultValue={values.roleId || null}
            required
            disabled={isSelf}
          >
            <SelectTrigger id="roleId" className="w-full">
              <SelectValue placeholder="Selecciona un rol" />
            </SelectTrigger>
            <SelectContent>
              {roleItems.map((role) => (
                <SelectItem key={role.value} value={role.value}>
                  {role.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {isSelf && (
            <FieldDescription>
              No puedes cambiar tu propio rol.
            </FieldDescription>
          )}
        </Field>

        {mode === 'edit' && (
          <Field orientation="horizontal">
            <FieldContent>
              <FieldLabel htmlFor="isActive">Cuenta activa</FieldLabel>
              <FieldDescription>
                {isSelf
                  ? 'No puedes desactivar tu propia cuenta.'
                  : 'Si la desactivas, pierde el acceso de inmediato.'}
              </FieldDescription>
            </FieldContent>
            <Switch
              id="isActive"
              name="isActive"
              uncheckedValue="off"
              defaultChecked={values.isActive === 'on'}
              disabled={isSelf}
            />
          </Field>
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
          {mode === 'create' ? 'Crear usuario' : 'Guardar cambios'}
        </Button>
      </DialogFooter>
    </form>
  );
}
