'use client';

import { useState, useTransition } from 'react';
import { PencilIcon, PlusIcon } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
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
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';
import {
  formatScore,
  parseScore,
  type GradingScale,
} from '@/lib/grading/scale';
import { deleteRecovery, saveRecovery } from '../actions';
import type { RecoveryRecord } from '../types';

type Props = {
  classroomSubjectId: string;
  enrollmentId: string;
  studentName: string;
  subjectName: string;
  originalScore: number | null;
  recovery: RecoveryRecord | null;
  scale: GradingScale;
};

function RecoveryForm({
  classroomSubjectId,
  enrollmentId,
  originalScore,
  recovery,
  scale,
  onDone,
}: Props & { onDone: () => void }) {
  const [score, setScore] = useState(
    recovery ? formatScore(recovery.score, scale) : '',
  );
  const [notes, setNotes] = useState(recovery?.notes ?? '');
  const [pending, startTransition] = useTransition();

  const parsed = parseScore(score, scale);
  const value = parsed.ok ? parsed.score : null;
  const error = parsed.ok ? null : parsed.message;

  const run = (action: () => ReturnType<typeof saveRecovery>) =>
    startTransition(async () => {
      const result = await action();
      if (!result.ok) {
        toast.error(result.message);
        return;
      }
      toast.success(result.message);
      onDone();
    });

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(event) => {
        event.preventDefault();
        if (value !== null)
          run(() =>
            saveRecovery(classroomSubjectId, enrollmentId, {
              score: value,
              notes,
            }),
          );
      }}
    >
      <FieldGroup>
        <Field data-invalid={!!error}>
          <FieldLabel htmlFor="recoveryScore">Nota de recuperación</FieldLabel>
          <Input
            id="recoveryScore"
            inputMode="decimal"
            autoComplete="off"
            className="w-28 tabular-nums"
            aria-invalid={!!error}
            value={score}
            onChange={(event) => setScore(event.target.value)}
            required
          />
          <FieldError>{error}</FieldError>
          <FieldDescription>
            Reemplaza el acumulado anual
            {originalScore !== null &&
              ` (${formatScore(originalScore, scale)})`}
            . Aprueba con {formatScore(scale.passingScore, scale)}.
            {value !== null &&
              (value >= scale.passingScore
                ? ' Con esta nota recupera la materia.'
                : ' Con esta nota sigue perdiendo la materia.')}
          </FieldDescription>
        </Field>
        <Field>
          <FieldLabel htmlFor="recoveryNotes">Observación</FieldLabel>
          <Input
            id="recoveryNotes"
            maxLength={1000}
            placeholder="Ej. Examen de recuperación del 20 de noviembre"
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
          />
        </Field>
      </FieldGroup>

      <DialogFooter className="sm:justify-between">
        {recovery ? (
          <Button
            type="button"
            variant="ghost"
            className="text-destructive"
            disabled={pending}
            onClick={() =>
              run(() => deleteRecovery(classroomSubjectId, enrollmentId))
            }
          >
            Quitar recuperación
          </Button>
        ) : (
          <span />
        )}
        <div className="flex gap-2">
          <DialogClose
            render={<Button variant="outline" type="button" />}
            disabled={pending}
          >
            Cancelar
          </DialogClose>
          <Button type="submit" disabled={value === null || pending}>
            {pending && <Spinner data-icon="inline-start" />}
            Guardar
          </Button>
        </div>
      </DialogFooter>
    </form>
  );
}

export function RecoveryDialog(props: Props) {
  const [open, setOpen] = useState(false);
  const { recovery, studentName, subjectName } = props;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button
            size="sm"
            variant={recovery ? 'ghost' : 'outline'}
            aria-label={`${recovery ? 'Editar' : 'Registrar'} la recuperación de ${studentName}`}
          />
        }
      >
        {recovery ? (
          <PencilIcon data-icon="inline-start" />
        ) : (
          <PlusIcon data-icon="inline-start" />
        )}
        {recovery ? 'Editar' : 'Registrar'}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Recuperación de {subjectName}</DialogTitle>
          <DialogDescription>{studentName}</DialogDescription>
        </DialogHeader>
        {open && <RecoveryForm {...props} onDone={() => setOpen(false)} />}
      </DialogContent>
    </Dialog>
  );
}
