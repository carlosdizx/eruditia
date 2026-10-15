'use client';

import { useState, useTransition } from 'react';
import {
  MoreHorizontalIcon,
  PencilIcon,
  PlusIcon,
  Trash2Icon,
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Spinner } from '@/components/ui/spinner';
import { NO_TEACHER, type Teacher } from '../../types';
import { assignSubject, removeAssignment, updateAssignment } from '../actions';
import type { ClassroomSubject } from '../types';
import { AssignmentForm, type SubjectOption } from './assignment-form';

export function AssignSubjectDialog({
  classroom,
  subjects,
  teachers,
}: {
  classroom: { id: string; name: string };
  // Solo las materias que aún no tiene el salón.
  subjects: SubjectOption[];
  teachers: Teacher[];
}) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button disabled={!subjects.length} />}>
        <PlusIcon data-icon="inline-start" />
        Agregar materia
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Agregar materia a {classroom.name}</DialogTitle>
          <DialogDescription>
            Elige la materia del catálogo y el profesor que la dicta.
          </DialogDescription>
        </DialogHeader>
        <AssignmentForm
          mode="create"
          action={assignSubject.bind(null, classroom.id)}
          subjects={subjects}
          teachers={teachers}
          onDone={() => setOpen(false)}
        />
      </DialogContent>
    </Dialog>
  );
}

export function AssignmentRowActions({
  classroomId,
  assignment,
  teachers,
}: {
  classroomId: string;
  assignment: ClassroomSubject;
  teachers: Teacher[];
}) {
  const [editOpen, setEditOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  // Un docente inactivo no está en la lista: se agrega para no perderlo.
  const teacherOptions =
    assignment.teacher &&
    !teachers.some(({ id }) => id === assignment.teacher?.id)
      ? [...teachers, assignment.teacher]
      : teachers;

  const onRemove = () =>
    startTransition(async () => {
      const result = await removeAssignment(classroomId, assignment.id);

      if (!result.ok) {
        toast.error(result.message);
        return;
      }

      setConfirmOpen(false);
      toast.success(`Se quitó ${assignment.subject.name} del salón`);
    });

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
          <DropdownMenuItem onClick={() => setEditOpen(true)}>
            <PencilIcon />
            Editar
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            variant="destructive"
            onClick={() => setConfirmOpen(true)}
          >
            <Trash2Icon />
            Quitar del salón
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{assignment.subject.name}</DialogTitle>
            <DialogDescription>
              Docente, horas y peso en el promedio.
            </DialogDescription>
          </DialogHeader>
          <AssignmentForm
            mode="edit"
            action={updateAssignment.bind(null, classroomId, assignment.id)}
            subjects={[]}
            teachers={teacherOptions}
            initialValues={{
              teacherId: assignment.teacherId ?? NO_TEACHER,
              weeklyHours: assignment.weeklyHours
                ? String(assignment.weeklyHours)
                : '',
              weightInGpa: String(assignment.weightInGpa),
            }}
            onDone={() => setEditOpen(false)}
          />
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={confirmOpen}
        onOpenChange={(open) => !pending && setConfirmOpen(open)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              ¿Quitar {assignment.subject.name} del salón?
            </AlertDialogTitle>
            <AlertDialogDescription>
              El profesor dejará de verla en sus clases.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={pending}>Cancelar</AlertDialogCancel>
            <Button variant="destructive" onClick={onRemove} disabled={pending}>
              {pending && <Spinner data-icon="inline-start" />}
              Quitar
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
