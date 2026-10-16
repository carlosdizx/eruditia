'use client';

import { useActionState, useState } from 'react';
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
import {
  NO_TEACHER,
  type ClassroomFormState,
  type ClassroomFormValues,
  type GradeLevelOption,
  type Teacher,
} from '../types';

type ClassroomFormProps = {
  mode: 'create' | 'edit';
  action: (
    state: ClassroomFormState,
    formData: FormData,
  ) => Promise<ClassroomFormState>;
  gradeLevels: GradeLevelOption[];
  teachers: Teacher[];
  // Nombres ya usados en el año, para proponer el siguiente (1°A, 1°B...).
  usedNames: string[];
  initialValues?: ClassroomFormValues;
  onDone: () => void;
};

const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

const suggestName = (shortName: string, usedNames: string[]) => {
  const used = new Set(usedNames.map((name) => name.toUpperCase()));
  const letter = [...LETTERS].find(
    (candidate) => !used.has(`${shortName}${candidate}`.toUpperCase()),
  );
  return letter ? `${shortName}${letter}` : shortName;
};

// Se monta cada vez que se abre el diálogo, así el estado empieza limpio.
export function ClassroomForm({
  mode,
  action,
  gradeLevels,
  teachers,
  usedNames,
  initialValues = {},
  onDone,
}: ClassroomFormProps) {
  const [state, formAction, pending] = useActionState(
    async (prev: ClassroomFormState, formData: FormData) => {
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

  // El nombre se propone al elegir el grado mientras el usuario no lo edite.
  const [name, setName] = useState(values.name ?? '');
  const [nameTouched, setNameTouched] = useState(!!values.name);
  // Controlados: al guardar se revalida la página y cambian los valores iniciales.
  const [gradeLevelId, setGradeLevelId] = useState<string | null>(
    values.gradeLevelId || null,
  );
  const [teacherId, setTeacherId] = useState<string>(
    values.homeroomTeacherId || NO_TEACHER,
  );

  const gradeItems = gradeLevels.map((grade) => ({
    value: grade.id,
    label: `${grade.shortName} · ${grade.name}`,
  }));
  const teacherItems = [
    { value: NO_TEACHER, label: 'Sin director de grupo' },
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
        <div className="grid gap-4 sm:grid-cols-[1fr_9rem]">
          <Field>
            <FieldLabel htmlFor="gradeLevelId">Grado</FieldLabel>
            <Select
              name="gradeLevelId"
              items={gradeItems}
              value={gradeLevelId}
              required
              onValueChange={(next) => {
                setGradeLevelId(next);
                const grade = gradeLevels.find(({ id }) => id === next);
                if (grade && !nameTouched)
                  setName(suggestName(grade.shortName, usedNames));
              }}
            >
              <SelectTrigger id="gradeLevelId" className="w-full">
                <SelectValue placeholder="Selecciona un grado" />
              </SelectTrigger>
              <SelectContent>
                {gradeItems.map((grade) => (
                  <SelectItem key={grade.value} value={grade.value}>
                    {grade.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field>
            <FieldLabel htmlFor="name">Nombre</FieldLabel>
            <Input
              id="name"
              name="name"
              required
              maxLength={30}
              placeholder="1°A"
              value={name}
              onChange={(event) => {
                setName(event.target.value);
                setNameTouched(true);
              }}
            />
          </Field>
        </div>

        <Field>
          <FieldLabel htmlFor="homeroomTeacherId">Director de grupo</FieldLabel>
          <Select
            name="homeroomTeacherId"
            items={teacherItems}
            value={teacherId}
            onValueChange={(next) => setTeacherId(next ?? NO_TEACHER)}
          >
            <SelectTrigger id="homeroomTeacherId" className="w-full">
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
          {!teachers.length && (
            <FieldDescription>
              Aún no hay profesores activos: créalos en Usuarios con el rol
              Profesor.
            </FieldDescription>
          )}
        </Field>

        <Field>
          <FieldLabel htmlFor="capacity">Cupo</FieldLabel>
          <Input
            id="capacity"
            name="capacity"
            type="number"
            min={1}
            max={200}
            step={1}
            placeholder="Opcional"
            className="w-32"
            defaultValue={values.capacity ?? ''}
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
          {mode === 'create' ? 'Crear salón' : 'Guardar cambios'}
        </Button>
      </DialogFooter>
    </form>
  );
}
