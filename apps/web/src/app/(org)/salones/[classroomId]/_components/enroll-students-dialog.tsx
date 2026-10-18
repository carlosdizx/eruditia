'use client';

import { useMemo, useState, useTransition } from 'react';
import { SearchIcon, UserPlusIcon } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Field, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';
import { enrollStudents } from '../actions';
import type { EnrollmentStudent } from '../types';

// Igual que la búsqueda de estudiantes de la API: cada palabra en algún campo.
const matches = (student: EnrollmentStudent, terms: string[]) => {
  const haystack = [
    student.firstName,
    student.lastName,
    student.documentNumber,
    student.studentCode,
  ]
    .join(' ')
    .toLocaleLowerCase('es');
  return terms.every((term) => haystack.includes(term));
};

const today = () => new Date().toLocaleDateString('en-CA');

export function EnrollStudentsDialog({
  classroom,
  candidates,
  available,
}: {
  classroom: { id: string; name: string };
  // Estudiantes activos sin salón en el año.
  candidates: EnrollmentStudent[];
  // Cupos libres; null si el salón no tiene cupo.
  available: number | null;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [enrollmentDate, setEnrollmentDate] = useState(today);
  const [pending, startTransition] = useTransition();

  const filtered = useMemo(() => {
    const terms = search
      .trim()
      .toLocaleLowerCase('es')
      .split(/\s+/)
      .filter(Boolean);
    return terms.length
      ? candidates.filter((student) => matches(student, terms))
      : candidates;
  }, [candidates, search]);

  const visibleSelected = filtered.filter(({ id }) => selected.has(id)).length;
  const overCapacity = available !== null && selected.size > available;

  const onOpenChange = (next: boolean) => {
    if (pending) return;
    setOpen(next);
    if (next) {
      setSearch('');
      setSelected(new Set());
      setEnrollmentDate(today());
    }
  };

  const toggle = (ids: string[], checked: boolean) =>
    setSelected((current) => {
      const next = new Set(current);
      ids.forEach((id) => (checked ? next.add(id) : next.delete(id)));
      return next;
    });

  const onEnroll = () =>
    startTransition(async () => {
      const result = await enrollStudents(
        classroom.id,
        [...selected],
        enrollmentDate,
      );

      if (!result.ok) {
        toast.error(result.message);
        return;
      }

      setOpen(false);
      toast.success(result.message);
    });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger render={<Button />}>
        <UserPlusIcon data-icon="inline-start" />
        Matricular estudiantes
      </DialogTrigger>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Matricular en {classroom.name}</DialogTitle>
          <DialogDescription>
            Solo aparecen los estudiantes activos que aún no tienen salón en
            este año lectivo.
            {available !== null && ` Cupos libres: ${available}.`}
          </DialogDescription>
        </DialogHeader>

        {!candidates.length ? (
          <p className="text-muted-foreground py-6 text-center text-sm">
            Todos los estudiantes activos ya tienen salón en este año.
          </p>
        ) : (
          <div className="flex min-w-0 flex-col gap-3">
            <div className="relative">
              <SearchIcon className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2" />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Buscar por nombre, documento o código"
                aria-label="Buscar estudiantes"
                className="pl-8"
              />
            </div>

            <div className="flex items-center justify-between gap-2 text-sm">
              <Field orientation="horizontal" className="w-auto">
                <Checkbox
                  id="enroll-all"
                  checked={
                    !!filtered.length && visibleSelected === filtered.length
                  }
                  indeterminate={
                    visibleSelected > 0 && visibleSelected < filtered.length
                  }
                  onCheckedChange={(checked) =>
                    toggle(
                      filtered.map(({ id }) => id),
                      checked,
                    )
                  }
                  disabled={pending || !filtered.length}
                />
                <FieldLabel htmlFor="enroll-all" className="font-normal">
                  Seleccionar {search.trim() ? 'resultados' : 'todos'} (
                  {filtered.length})
                </FieldLabel>
              </Field>
              <span className="text-muted-foreground tabular-nums">
                {selected.size} seleccionados
              </span>
            </div>

            <ul className="max-h-72 divide-y overflow-y-auto rounded-lg border">
              {filtered.map((student) => (
                <li key={student.id}>
                  <label
                    htmlFor={`enroll-${student.id}`}
                    className="hover:bg-muted/50 flex cursor-pointer items-center gap-3 px-3 py-2"
                  >
                    <Checkbox
                      id={`enroll-${student.id}`}
                      checked={selected.has(student.id)}
                      onCheckedChange={(checked) =>
                        toggle([student.id], checked)
                      }
                      disabled={pending}
                    />
                    <span className="flex min-w-0 flex-col">
                      <span className="truncate text-sm font-medium">
                        {student.lastName} {student.firstName}
                      </span>
                      <span className="text-muted-foreground text-xs">
                        {student.documentType} {student.documentNumber} · Código{' '}
                        {student.studentCode}
                      </span>
                    </span>
                  </label>
                </li>
              ))}
              {!filtered.length && (
                <li className="text-muted-foreground px-3 py-6 text-center text-sm">
                  Ningún estudiante coincide con la búsqueda.
                </li>
              )}
            </ul>

            <Field>
              <FieldLabel htmlFor="enrollmentDate">
                Fecha de matrícula
              </FieldLabel>
              <Input
                id="enrollmentDate"
                type="date"
                value={enrollmentDate}
                onChange={(event) => setEnrollmentDate(event.target.value)}
                required
                className="w-auto"
              />
            </Field>

            {overCapacity && (
              <p className="text-destructive text-sm" role="alert">
                Seleccionaste más estudiantes que cupos libres ({available}).
              </p>
            )}
          </div>
        )}

        <DialogFooter>
          <DialogClose
            render={<Button variant="outline" type="button" />}
            disabled={pending}
          >
            Cancelar
          </DialogClose>
          <Button
            onClick={onEnroll}
            disabled={
              pending || !selected.size || overCapacity || !enrollmentDate
            }
          >
            {pending && <Spinner data-icon="inline-start" />}
            Matricular{selected.size ? ` (${selected.size})` : ''}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
