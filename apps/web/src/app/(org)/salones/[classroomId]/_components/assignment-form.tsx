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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Spinner } from '@/components/ui/spinner';
import { NO_TEACHER, type Teacher } from '../../types';
import type { AssignmentFormState, AssignmentFormValues } from '../types';

export type SubjectOption = { id: string; name: string; code: string };

// Se monta cada vez que se abre el diálogo, así el estado empieza limpio.
export function AssignmentForm({
  mode,
  action,
  subjects,
  teachers,
  initialValues = {},
  onDone,
}: {
  // En edición la materia no cambia: para otra se quita y se asigna.
  mode: 'create' | 'edit';
  action: (
    state: AssignmentFormState,
    formData: FormData,
  ) => Promise<AssignmentFormState>;
  subjects: SubjectOption[];
  teachers: Teacher[];
  initialValues?: AssignmentFormValues;
  onDone: () => void;
}) {
  const [state, formAction, pending] = useActionState(
    async (prev: AssignmentFormState, formData: FormData) => {
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

  const subjectItems = subjects.map((subject) => ({
    value: subject.id,
    label: `${subject.name} (${subject.code})`,
  }));
  const teacherItems = [
    { value: NO_TEACHER, label: 'Sin docente asignado' },
    ...teachers.map((teacher) => ({
      value: teacher.id,
      label: `${teacher.firstName} ${teacher.lastName}`,
    })),
  ];

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
        {mode === 'create' && (
          <Field>
            <FieldLabel htmlFor="subjectId">Materia</FieldLabel>
            <Select
              name="subjectId"
              items={subjectItems}
              defaultValue={values.subjectId || null}
              required
            >
              <SelectTrigger id="subjectId" className="w-full">
                <SelectValue placeholder="Selecciona una materia" />
              </SelectTrigger>
              <SelectContent>
                {subjectItems.map((subject) => (
                  <SelectItem key={subject.value} value={subject.value}>
                    {subject.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        )}

        <Field>
          <FieldLabel htmlFor="teacherId">Docente</FieldLabel>
          <Select
            name="teacherId"
            items={teacherItems}
            defaultValue={values.teacherId || NO_TEACHER}
          >
            <SelectTrigger id="teacherId" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {teacherItems.map((teacher) => (
                <SelectItem key={teacher.value} value={teacher.value}>
                  {teacher.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <FieldDescription>
            El profesor verá este salón y esta materia en “Mis clases”.
          </FieldDescription>
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field>
            <FieldLabel htmlFor="weeklyHours">Horas semanales</FieldLabel>
            <Input
              id="weeklyHours"
              name="weeklyHours"
              type="number"
              min={1}
              max={40}
              step={1}
              placeholder="Opcional"
              defaultValue={values.weeklyHours ?? ''}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="weightInGpa">Peso en el promedio</FieldLabel>
            <Input
              id="weightInGpa"
              name="weightInGpa"
              type="number"
              min={0.1}
              max={10}
              step={0.01}
              required
              defaultValue={values.weightInGpa ?? '1'}
            />
          </Field>
        </div>
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
          {mode === 'create' ? 'Asignar materia' : 'Guardar cambios'}
        </Button>
      </DialogFooter>
    </form>
  );
}
