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
import { deleteGradeLevel, updateGradeLevel } from '../actions';
import type { GradeLevel } from '../types';
import { GradeLevelForm } from './grade-level-form';

export function GradeLevelRowActions({
  gradeLevel,
  canUpdate,
  canDelete,
}: {
  gradeLevel: GradeLevel;
  canUpdate: boolean;
  canDelete: boolean;
}) {
  const [editOpen, setEditOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  const onDelete = () =>
    startTransition(async () => {
      const result = await deleteGradeLevel(gradeLevel.id);

      if (!result.ok) {
        toast.error(result.message);
        return;
      }

      setConfirmOpen(false);
      toast.success(`Se eliminó el grado ${gradeLevel.name}`);
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
              <DialogTitle>Editar grado</DialogTitle>
              <DialogDescription>{gradeLevel.name}</DialogDescription>
            </DialogHeader>
            <GradeLevelForm
              mode="edit"
              action={updateGradeLevel.bind(null, gradeLevel.id)}
              initialValues={{
                name: gradeLevel.name,
                shortName: gradeLevel.shortName,
                sequenceOrder: String(gradeLevel.sequenceOrder),
                isFinalGrade: gradeLevel.isFinalGrade ? 'on' : 'off',
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
                ¿Eliminar el grado {gradeLevel.name}?
              </AlertDialogTitle>
              <AlertDialogDescription>
                Dejará de estar disponible para crear salones.
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
