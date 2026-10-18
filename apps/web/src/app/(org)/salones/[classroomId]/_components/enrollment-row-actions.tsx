'use client';

import { useState, useTransition } from 'react';
import {
  ArrowRightLeftIcon,
  LogOutIcon,
  MoreHorizontalIcon,
  RotateCcwIcon,
  Trash2Icon,
  TruckIcon,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Field, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Spinner } from '@/components/ui/spinner';
import { removeEnrollment, updateEnrollment } from '../actions';
import type { Enrollment, EnrollmentActionResult } from '../types';

type Dialog = 'move' | 'withdrawn' | 'transferred' | 'reactivate' | 'remove';

const CLOSE_COPY = {
  withdrawn: {
    title: 'Retirar',
    description: 'Deja de cursar este año; su matrícula queda en el historial.',
    done: 'Se registró el retiro',
  },
  transferred: {
    title: 'Trasladar',
    description:
      'Se va a otro colegio; su matrícula queda en el historial como trasladado.',
    done: 'Se registró el traslado',
  },
} as const;

export function EnrollmentRowActions({
  classroomId,
  enrollment,
  classrooms,
  canUpdate,
  canDelete,
}: {
  classroomId: string;
  enrollment: Enrollment;
  // Los demás salones del mismo año.
  classrooms: { id: string; name: string }[];
  canUpdate: boolean;
  canDelete: boolean;
}) {
  const [dialog, setDialog] = useState<Dialog | null>(null);
  const [targetId, setTargetId] = useState(classrooms[0]?.id ?? '');
  const [notes, setNotes] = useState('');
  const [pending, startTransition] = useTransition();

  const name = `${enrollment.student.firstName} ${enrollment.student.lastName}`;
  const inProgress = enrollment.status === 'in_progress';
  const reactivable =
    enrollment.status === 'withdrawn' || enrollment.status === 'transferred';
  const target = classrooms.find(({ id }) => id === targetId);

  const openDialog = (next: Dialog) => {
    setNotes('');
    setDialog(next);
  };

  const run = (action: () => Promise<EnrollmentActionResult>) =>
    startTransition(async () => {
      const result = await action();

      if (!result.ok) {
        toast.error(result.message);
        return;
      }

      setDialog(null);
      toast.success(result.message);
    });

  const onConfirm = () => {
    if (dialog === 'move')
      return run(() =>
        updateEnrollment(
          classroomId,
          enrollment.id,
          { classroomId: targetId },
          `${name} pasó a ${target?.name}`,
        ),
      );
    if (dialog === 'withdrawn' || dialog === 'transferred')
      return run(() =>
        updateEnrollment(
          classroomId,
          enrollment.id,
          { status: dialog, promotionNotes: notes.trim() || null },
          CLOSE_COPY[dialog].done,
        ),
      );
    if (dialog === 'reactivate')
      return run(() =>
        updateEnrollment(
          classroomId,
          enrollment.id,
          { status: 'in_progress' },
          `${name} vuelve a cursar en el salón`,
        ),
      );
    if (dialog === 'remove')
      return run(() => removeEnrollment(classroomId, enrollment.id));
  };

  const items = classrooms.map(({ id, name }) => ({ value: id, label: name }));

  const copy =
    dialog === 'move'
      ? {
          title: `Cambiar de salón a ${name}`,
          description:
            'Sigue cursando el mismo año lectivo en el salón que elijas.',
          action: 'Cambiar de salón',
        }
      : dialog === 'withdrawn' || dialog === 'transferred'
        ? {
            title: `¿${CLOSE_COPY[dialog].title} a ${name}?`,
            description: CLOSE_COPY[dialog].description,
            action: CLOSE_COPY[dialog].title,
          }
        : dialog === 'reactivate'
          ? {
              title: `¿Reactivar la matrícula de ${name}?`,
              description: 'Vuelve a cursar el año en este salón.',
              action: 'Reactivar',
            }
          : {
              title: `¿Anular la matrícula de ${name}?`,
              description:
                'Úsalo solo si se matriculó por error: la matrícula desaparece de la lista y del historial. Para un retiro usa "Retirar".',
              action: 'Anular matrícula',
            };

  if (!canUpdate && !canDelete) return null;

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button variant="ghost" size="icon-sm" aria-label="Acciones" />
          }
        >
          <MoreHorizontalIcon />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="min-w-44">
          {canUpdate && inProgress && (
            <>
              <DropdownMenuItem
                onClick={() => openDialog('move')}
                disabled={!classrooms.length}
              >
                <ArrowRightLeftIcon />
                Cambiar de salón
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => openDialog('withdrawn')}>
                <LogOutIcon />
                Retirar
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => openDialog('transferred')}>
                <TruckIcon />
                Trasladar
              </DropdownMenuItem>
            </>
          )}
          {canUpdate && reactivable && (
            <DropdownMenuItem onClick={() => openDialog('reactivate')}>
              <RotateCcwIcon />
              Reactivar
            </DropdownMenuItem>
          )}
          {canDelete && (
            <>
              {canUpdate && (inProgress || reactivable) && (
                <DropdownMenuSeparator />
              )}
              <DropdownMenuItem
                variant="destructive"
                onClick={() => openDialog('remove')}
              >
                <Trash2Icon />
                Anular matrícula
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog
        open={!!dialog}
        onOpenChange={(open) => !pending && !open && setDialog(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{copy.title}</AlertDialogTitle>
            <AlertDialogDescription>{copy.description}</AlertDialogDescription>
          </AlertDialogHeader>

          {dialog === 'move' && (
            <Field>
              <FieldLabel htmlFor="targetClassroom">Nuevo salón</FieldLabel>
              <Select
                items={items}
                value={targetId}
                onValueChange={(value) => setTargetId(String(value))}
              >
                <SelectTrigger id="targetClassroom" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {items.map((item) => (
                    <SelectItem key={item.value} value={item.value}>
                      {item.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          )}

          {(dialog === 'withdrawn' || dialog === 'transferred') && (
            <Field>
              <FieldLabel htmlFor="enrollmentNotes">
                Observación (opcional)
              </FieldLabel>
              <Input
                id="enrollmentNotes"
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                maxLength={1000}
                placeholder="Ej. Cambio de ciudad"
              />
            </Field>
          )}

          <AlertDialogFooter>
            <AlertDialogCancel disabled={pending}>Cancelar</AlertDialogCancel>
            <Button
              variant={dialog === 'remove' ? 'destructive' : 'default'}
              onClick={onConfirm}
              disabled={pending || (dialog === 'move' && !target)}
            >
              {pending && <Spinner data-icon="inline-start" />}
              {copy.action}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
