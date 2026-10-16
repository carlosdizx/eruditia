'use client';

import Link from 'next/link';
import { useActionState, useState } from 'react';
import { CircleAlertIcon } from 'lucide-react';
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
  FieldContent,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';
import { Switch } from '@/components/ui/switch';
import type { OrganizationFormState, OrganizationFormValues } from '../types';

const SLUG_PATTERN = '[a-z0-9]+(-[a-z0-9]+)*';

const toSlug = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 100);

type FieldConfig = {
  name: keyof OrganizationFormValues;
  label: string;
  type?: 'text' | 'email' | 'url' | 'tel' | 'number';
  step?: string;
  min?: number;
  max?: number;
  description?: string;
  required?: boolean;
  maxLength?: number;
  placeholder?: string;
  autoComplete?: string;
};

type Section = { title: string; description: string; fields: FieldConfig[] };

const DETAILS: Section = {
  title: 'Datos generales',
  description: 'Cómo se identifica la organización.',
  fields: [
    { name: 'legalName', label: 'Razón social', maxLength: 255 },
    { name: 'taxId', label: 'Identificación fiscal', maxLength: 50 },
    { name: 'schoolCode', label: 'Código de institución', maxLength: 50 },
  ],
};

const CONTACT: Section = {
  title: 'Contacto',
  description: 'Datos públicos de contacto.',
  fields: [
    {
      name: 'email',
      label: 'Correo',
      type: 'email',
      placeholder: 'contacto@colegio.edu',
    },
    { name: 'phone', label: 'Teléfono', type: 'tel', maxLength: 30 },
    {
      name: 'website',
      label: 'Sitio web',
      type: 'url',
      placeholder: 'https://',
    },
    {
      name: 'logoUrl',
      label: 'URL del logo',
      type: 'url',
      placeholder: 'https://',
    },
  ],
};

const LOCATION: Section = {
  title: 'Ubicación',
  description: 'Dirección de la sede principal.',
  fields: [
    { name: 'address', label: 'Dirección', maxLength: 255 },
    { name: 'city', label: 'Ciudad', maxLength: 100 },
    { name: 'state', label: 'Estado / provincia', maxLength: 100 },
    {
      name: 'country',
      label: 'País (código ISO)',
      maxLength: 2,
      placeholder: 'MX',
    },
  ],
};

const EVALUATION: Section = {
  title: 'Evaluación',
  description: 'Reglas académicas de la organización.',
  fields: [
    {
      name: 'passingGrade',
      label: 'Nota mínima de aprobación',
      type: 'number',
      step: '0.01',
      min: 0,
      max: 999.99,
      placeholder: '3.00',
      description:
        'Con ella el asistente de promoción sugiere quién aprueba el año.',
    },
  ],
};

const OWNER: Section = {
  title: 'Administrador',
  description:
    'Se crea como ADMIN de la organización y recibe una contraseña temporal por correo.',
  fields: [
    {
      name: 'owner.firstName',
      label: 'Nombre',
      required: true,
      maxLength: 100,
    },
    {
      name: 'owner.lastName',
      label: 'Apellido',
      required: true,
      maxLength: 100,
    },
    { name: 'owner.email', label: 'Correo', type: 'email', required: true },
  ],
};

function SectionCard({
  section,
  values,
  children,
}: {
  section: Section;
  values: OrganizationFormValues;
  children?: React.ReactNode;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{section.title}</CardTitle>
        <CardDescription>{section.description}</CardDescription>
      </CardHeader>
      <CardContent>
        <FieldGroup className="grid gap-4 md:grid-cols-2">
          {children}
          {section.fields.map((field) => (
            <Field key={field.name}>
              <FieldLabel htmlFor={field.name}>
                {field.label}
                {field.required && <span className="text-destructive">*</span>}
              </FieldLabel>
              <Input
                id={field.name}
                name={field.name}
                type={field.type ?? 'text'}
                required={field.required}
                maxLength={field.maxLength}
                step={field.step}
                min={field.min}
                max={field.max}
                placeholder={field.placeholder}
                defaultValue={values[field.name] ?? ''}
              />
              {field.description && (
                <FieldDescription>{field.description}</FieldDescription>
              )}
            </Field>
          ))}
        </FieldGroup>
      </CardContent>
    </Card>
  );
}

type OrganizationFormProps = {
  mode: 'create' | 'edit';
  action: (
    state: OrganizationFormState,
    formData: FormData,
  ) => Promise<OrganizationFormState>;
  initialValues?: OrganizationFormValues;
};

export function OrganizationForm({
  mode,
  action,
  initialValues = {},
}: OrganizationFormProps) {
  const [state, formAction, pending] = useActionState(action, {
    status: 'idle',
  });

  // Tras un error se conserva lo que se envió (React reinicia el form).
  const values = state.status === 'error' ? state.values : initialValues;

  const [name, setName] = useState(values.name ?? '');
  const [slug, setSlug] = useState(values.slug ?? '');
  const [slugTouched, setSlugTouched] = useState(mode === 'edit');

  return (
    <form action={formAction} className="flex flex-col gap-4">
      {state.status === 'error' && (
        <div
          role="alert"
          className="border-destructive/30 bg-destructive/10 text-destructive flex items-start gap-2 rounded-lg border px-3 py-2 text-sm"
        >
          <CircleAlertIcon className="mt-0.5 size-4 shrink-0" />
          {state.message}
        </div>
      )}

      <SectionCard section={DETAILS} values={values}>
        <Field>
          <FieldLabel htmlFor="name">
            Nombre<span className="text-destructive">*</span>
          </FieldLabel>
          <Input
            id="name"
            name="name"
            required
            maxLength={255}
            value={name}
            onChange={(event) => {
              setName(event.target.value);
              if (!slugTouched) setSlug(toSlug(event.target.value));
            }}
          />
        </Field>
        <Field>
          <FieldLabel htmlFor="slug">
            Identificador<span className="text-destructive">*</span>
          </FieldLabel>
          <Input
            id="slug"
            name="slug"
            required
            maxLength={100}
            pattern={SLUG_PATTERN}
            title="Solo minúsculas, números y guiones"
            value={slug}
            onChange={(event) => {
              setSlugTouched(true);
              setSlug(event.target.value.toLowerCase());
            }}
          />
          <FieldDescription>Minúsculas, números y guiones.</FieldDescription>
        </Field>
      </SectionCard>

      <div className="grid gap-4 lg:grid-cols-2">
        <SectionCard section={CONTACT} values={values} />
        <SectionCard section={LOCATION} values={values} />
      </div>

      <SectionCard section={EVALUATION} values={values} />

      {mode === 'create' && <SectionCard section={OWNER} values={values} />}

      {mode === 'edit' && (
        <Card>
          <CardContent>
            <Field orientation="horizontal">
              <FieldContent>
                <FieldLabel htmlFor="isActive">Organización activa</FieldLabel>
                <FieldDescription>
                  Al desactivarla, ninguno de sus usuarios podrá acceder.
                </FieldDescription>
              </FieldContent>
              <Switch
                id="isActive"
                name="isActive"
                defaultChecked={values.isActive === 'on'}
              />
            </Field>
          </CardContent>
        </Card>
      )}

      <div className="flex justify-end gap-2">
        <Button
          variant="outline"
          nativeButton={false}
          render={<Link href="/admin/organizaciones" />}
        >
          Cancelar
        </Button>
        <Button type="submit" disabled={pending}>
          {pending && <Spinner data-icon="inline-start" />}
          {mode === 'create' ? 'Crear organización' : 'Guardar cambios'}
        </Button>
      </div>
    </form>
  );
}
