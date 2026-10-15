'use client';

import Link from 'next/link';
import { useMemo, useState, useTransition } from 'react';
import { KeyRoundIcon } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty';
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
  FieldTitle,
} from '@/components/ui/field';
import { Spinner } from '@/components/ui/spinner';
import { PERMISSION_LABELS } from '@/lib/auth/permissions';
import { setOrganizationPermissions } from '../actions';

// Contrato de GET /permissions.
export type CatalogPermission = {
  id: string;
  key: string;
  resource: string;
  action: string;
  description: string | null;
};

const RESOURCE_LABELS: Record<string, string> = {
  user: 'Usuarios',
  role: 'Roles',
  student: 'Estudiantes',
  'academic-year': 'Años lectivos',
  'grade-level': 'Grados',
  classroom: 'Salones',
  subject: 'Materias',
  'classroom-subject': 'Carga académica',
  enrollment: 'Matrículas',
};

type PermissionsFormProps = {
  organization: { id: string; name: string };
  catalog: CatalogPermission[];
  assigned: string[];
};

const sameKeys = (a: Set<string>, b: Set<string>) =>
  a.size === b.size && [...a].every((key) => b.has(key));

export function PermissionsForm({
  organization,
  catalog,
  assigned,
}: PermissionsFormProps) {
  const [saved, setSaved] = useState(() => new Set(assigned));
  const [selected, setSelected] = useState(() => new Set(assigned));
  const [pending, startTransition] = useTransition();

  const groups = useMemo(
    () =>
      Object.entries(
        Object.groupBy(catalog, (permission) => permission.resource),
      ) as [string, CatalogPermission[]][],
    [catalog],
  );

  const dirty = !sameKeys(selected, saved);

  const toggle = (keys: string[], checked: boolean) =>
    setSelected((current) => {
      const next = new Set(current);
      for (const key of keys) {
        if (checked) next.add(key);
        else next.delete(key);
      }
      return next;
    });

  const onSave = () =>
    startTransition(async () => {
      const result = await setOrganizationPermissions(organization.id, [
        ...selected,
      ]);

      if (!result.ok) {
        toast.error(result.message);
        return;
      }

      const next = new Set(result.permissions);
      setSaved(next);
      setSelected(next);
      toast.success(`Permisos de ${organization.name} actualizados`);
    });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <KeyRoundIcon className="text-muted-foreground size-4" />
          {organization.name}
        </CardTitle>
        <CardDescription>
          Elige qué puede usar esta organización. Los cambios aplican a todos
          sus usuarios en su siguiente acción.
        </CardDescription>
      </CardHeader>

      <CardContent>
        {groups.length ? (
          <FieldGroup>
            {groups.map(([resource, permissions]) => {
              const keys = permissions.map(({ key }) => key);
              const count = keys.filter((key) => selected.has(key)).length;

              return (
                <FieldSet key={resource}>
                  <div className="flex items-center justify-between gap-2">
                    <FieldLegend variant="label" className="mb-0">
                      {RESOURCE_LABELS[resource] ?? resource}
                    </FieldLegend>
                    <Field orientation="horizontal" className="w-auto">
                      <Checkbox
                        id={`all-${resource}`}
                        checked={count === keys.length}
                        indeterminate={count > 0 && count < keys.length}
                        onCheckedChange={(checked) => toggle(keys, checked)}
                        disabled={pending}
                      />
                      <FieldLabel
                        htmlFor={`all-${resource}`}
                        className="text-muted-foreground font-normal"
                      >
                        Todos ({count}/{keys.length})
                      </FieldLabel>
                    </Field>
                  </div>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {permissions.map((permission) => (
                      <FieldLabel key={permission.key} htmlFor={permission.key}>
                        <Field orientation="horizontal">
                          <Checkbox
                            id={permission.key}
                            checked={selected.has(permission.key)}
                            onCheckedChange={(checked) =>
                              toggle([permission.key], checked)
                            }
                            disabled={pending}
                          />
                          <FieldContent>
                            <FieldTitle>
                              {PERMISSION_LABELS[permission.key] ??
                                permission.key}
                            </FieldTitle>
                            <FieldDescription>
                              {permission.description}
                            </FieldDescription>
                          </FieldContent>
                        </Field>
                      </FieldLabel>
                    ))}
                  </div>
                </FieldSet>
              );
            })}
          </FieldGroup>
        ) : (
          <Empty>
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <KeyRoundIcon />
              </EmptyMedia>
              <EmptyTitle>Sin permisos en el catálogo</EmptyTitle>
              <EmptyDescription>
                La API no tiene permisos registrados.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        )}
      </CardContent>

      <CardFooter className="flex flex-col-reverse gap-2 border-t sm:flex-row sm:justify-between">
        <div className="text-muted-foreground flex items-center gap-2 text-sm">
          <Badge variant="secondary">{selected.size}</Badge>
          de {catalog.length} permisos seleccionados
          {dirty && <span className="text-foreground">· sin guardar</span>}
        </div>
        <div className="flex gap-2">
          {dirty && (
            <Button
              variant="ghost"
              onClick={() => setSelected(new Set(saved))}
              disabled={pending}
            >
              Descartar
            </Button>
          )}
          {!dirty && (
            <Button
              variant="outline"
              nativeButton={false}
              render={<Link href="/admin/organizaciones" />}
            >
              Volver
            </Button>
          )}
          <Button onClick={onSave} disabled={!dirty || pending}>
            {pending && <Spinner data-icon="inline-start" />}
            Guardar permisos
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
}
