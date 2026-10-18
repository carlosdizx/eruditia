'use client';

import { useState, useTransition } from 'react';
import { MoreHorizontalIcon, PencilIcon, Trash2Icon } from 'lucide-react';
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Spinner } from '@/components/ui/spinner';
import { deleteClassroom, updateClassroom } from '../actions';
import {
  NO_TEACHER,
  type Classroom,
  type GradeLevelOption,
  type Teacher,
} from '../types';
import { ClassroomForm } from './classroom-form';

export function ClassroomRowActions({
  classroom,
  gradeLevels,
  teachers,
  usedNames,
  canUpdate,
  canDelete,
}: {
  classroom: Classroom;
  gradeLevels: GradeLevelOption[];
  teachers: Teacher[];
  usedNames: string[];
  canUpdate: boolean;
  canDelete: boolean;
}) {
  const [editOpen, setEditOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  const onDelete = () =>
    startTransition(async () => {
      const result = await deleteClassroom(classroom.id);

      if (!result.ok) {
        toast.error(result.message);
        return;
      }

      setConfirmOpen(false);
      toast.success(`Se eliminó el salón ${classroom.name}`);
    });

  // Un director inactivo no está en la lista: se agrega para no perderlo.
  const teacherOptions =
    classroom.homeroomTeacher &&
    !teachers.some(({ id }) => id === classroom.homeroomTeacher?.id)
      ? [...teachers, classroom.homeroomTeacher]
      : teachers;

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
        <DropdownMenuContent align="end" className="min-w-36">
          {canUpdate && (
            <DropdownMenuItem onClick={() => setEditOpen(true)}>
              <PencilIcon />
              Editar
            </DropdownMenuItem>
          )}
          {canUpdate && canDelete && <DropdownMenuSeparator />}
          {canDelete && (
            <DropdownMenuItem
              variant="destructive"
              onClick={() => setConfirmOpen(true)}
            >
              <Trash2Icon />
              Eliminar
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {canUpdate && (
        <Dialog open={editOpen} onOpenChange={setEditOpen}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Editar salón</DialogTitle>
              <DialogDescription>{classroom.name}</DialogDescription>
            </DialogHeader>
            <ClassroomForm
              mode="edit"
              action={updateClassroom.bind(null, classroom.id)}
              gradeLevels={gradeLevels}
              teachers={teacherOptions}
              usedNames={usedNames}
              initialValues={{
                gradeLevelId: classroom.gradeLevelId,
                name: classroom.name,
                homeroomTeacherId: classroom.homeroomTeacher?.id ?? NO_TEACHER,
                capacity: classroom.capacity ? String(classroom.capacity) : '',
              }}
              onDone={() => setEditOpen(false)}
            />
          </DialogContent>
        </Dialog>
      )}

      {canDelete && (
        <AlertDialog
          open={confirmOpen}
          onOpenChange={(open) => !pending && setConfirmOpen(open)}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>
                ¿Eliminar el salón {classroom.name}?
              </AlertDialogTitle>
              <AlertDialogDescription>
                Dejará de aparecer en el año lectivo.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={pending}>Cancelar</AlertDialogCancel>
              <Button
                variant="destructive"
                onClick={onDelete}
                disabled={pending}
              >
                {pending && <Spinner data-icon="inline-start" />}
                Eliminar
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </>
  );
}
