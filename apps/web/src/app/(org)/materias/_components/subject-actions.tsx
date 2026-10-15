'use client';

import { useState, useTransition } from 'react';
import {
  MoreHorizontalIcon,
  PencilIcon,
  PlusIcon,
  Trash2Icon,
  WandSparklesIcon,
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
import {
  createSubject,
  deleteSubject,
  loadStandardSubjects,
  updateSubject,
} from '../actions';
import type { Subject } from '../types';
import { SubjectForm } from './subject-form';

export function CreateSubjectDialog({ areas }: { areas: string[] }) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button />}>
        <PlusIcon data-icon="inline-start" />
        Nueva materia
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Nueva materia</DialogTitle>
          <DialogDescription>
            El catálogo se reutiliza cada año lectivo.
          </DialogDescription>
        </DialogHeader>
        <SubjectForm
          mode="create"
          action={createSubject}
          areas={areas}
          onDone={() => setOpen(false)}
        />
      </DialogContent>
    </Dialog>
  );
}

// Crea solo las materias base que falten.
export function LoadStandardSubjectsButton() {
  const [pending, startTransition] = useTransition();

  return (
    <Button
      variant="outline"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          const result = await loadStandardSubjects();
          if (result.ok) toast.success(result.message);
          else toast.error(result.message);
        })
      }
    >
      {pending ? (
        <Spinner data-icon="inline-start" />
      ) : (
        <WandSparklesIcon data-icon="inline-start" />
      )}
      Cargar materias base
    </Button>
  );
}

export function SubjectRowActions({
  subject,
  areas,
  canUpdate,
  canDelete,
}: {
  subject: Subject;
  areas: string[];
  canUpdate: boolean;
  canDelete: boolean;
}) {
  const [editOpen, setEditOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  const onDelete = () =>
    startTransition(async () => {
      const result = await deleteSubject(subject.id);

      if (!result.ok) {
        toast.error(result.message);
        return;
      }

      setConfirmOpen(false);
      toast.success(`Se eliminó la materia ${subject.name}`);
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
              <DialogTitle>Editar materia</DialogTitle>
              <DialogDescription>{subject.name}</DialogDescription>
            </DialogHeader>
            <SubjectForm
              mode="edit"
              action={updateSubject.bind(null, subject.id)}
              areas={areas}
              initialValues={{
                name: subject.name,
                code: subject.code,
                areaName: subject.areaName ?? '',
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
                ¿Eliminar la materia {subject.name}?
              </AlertDialogTitle>
              <AlertDialogDescription>
                Solo se puede eliminar si no está asignada a ningún salón.
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
