'use client';

import { useState, useTransition } from 'react';
import {
  LinkIcon,
  MoreHorizontalIcon,
  PencilIcon,
  RefreshCwIcon,
  UnlinkIcon,
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
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Spinner } from '@/components/ui/spinner';
import {
  changeStudentStatus,
  linkStudentAccount,
  unlinkStudentAccount,
  updateStudent,
} from '../actions';
import {
  STUDENT_STATUS_LABELS,
  STUDENT_STATUSES,
  type Student,
  type StudentStatus,
} from '../types';
import { LinkAccountForm } from './link-account-form';
import { StudentForm } from './student-form';

export function StudentRowActions({ student }: { student: Student }) {
  const [editOpen, setEditOpen] = useState(false);
  const [linkOpen, setLinkOpen] = useState(false);
  const [unlinkOpen, setUnlinkOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  const fullName = `${student.firstName} ${student.lastName}`;
  const hasAccount = !!student.user;

  const onStatusChange = (status: StudentStatus) => {
    if (status === student.status) return;

    startTransition(async () => {
      const result = await changeStudentStatus(student.id, status);

      if (!result.ok) {
        toast.error(result.message);
        return;
      }

      toast.success(
        `${fullName} ahora está ${STUDENT_STATUS_LABELS[status].toLowerCase()}`,
      );
    });
  };

  const unlink = () =>
    startTransition(async () => {
      const result = await unlinkStudentAccount(student.id);
      setUnlinkOpen(false);

      if (!result.ok) {
        toast.error(result.message);
        return;
      }

      toast.success(`Se desvinculó la cuenta de ${fullName}`);
    });

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="Acciones"
              disabled={pending}
            />
          }
        >
          <MoreHorizontalIcon />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="min-w-48">
          <DropdownMenuItem onClick={() => setEditOpen(true)}>
            <PencilIcon />
            Editar
          </DropdownMenuItem>
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>
              <RefreshCwIcon />
              Cambiar estado
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent>
              <DropdownMenuRadioGroup
                value={student.status}
                onValueChange={(value: StudentStatus) => onStatusChange(value)}
              >
                {STUDENT_STATUSES.map((status) => (
                  <DropdownMenuRadioItem
                    key={status.value}
                    value={status.value}
                  >
                    {status.label}
                  </DropdownMenuRadioItem>
                ))}
              </DropdownMenuRadioGroup>
            </DropdownMenuSubContent>
          </DropdownMenuSub>
          <DropdownMenuSeparator />
          {hasAccount ? (
            <DropdownMenuItem onClick={() => setUnlinkOpen(true)}>
              <UnlinkIcon />
              Desvincular cuenta
            </DropdownMenuItem>
          ) : (
            <DropdownMenuItem onClick={() => setLinkOpen(true)}>
              <LinkIcon />
              Vincular cuenta de acceso
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Editar estudiante</DialogTitle>
            <DialogDescription>{fullName}</DialogDescription>
          </DialogHeader>
          <StudentForm
            mode="edit"
            action={updateStudent.bind(null, student.id)}
            initialValues={{
              firstName: student.firstName,
              lastName: student.lastName,
              documentType: student.documentType,
              documentNumber: student.documentNumber,
              studentCode: student.studentCode,
              birthDate: student.birthDate ?? '',
              guardianName: student.guardianName ?? '',
              guardianPhone: student.guardianPhone ?? '',
              guardianEmail: student.guardianEmail ?? '',
              status: student.status,
            }}
            onDone={() => setEditOpen(false)}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={linkOpen} onOpenChange={setLinkOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Vincular cuenta de acceso</DialogTitle>
            <DialogDescription>
              {fullName} iniciará sesión con su correo para ver sus notas.
            </DialogDescription>
          </DialogHeader>
          <LinkAccountForm
            action={linkStudentAccount.bind(null, student.id)}
            onDone={() => setLinkOpen(false)}
          />
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={unlinkOpen}
        onOpenChange={(open) => !pending && setUnlinkOpen(open)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              ¿Desvincular la cuenta de {fullName}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              La cuenta {student.user?.email ?? ''} se desactivará. Sus notas se
              podrán seguir consultando en el portal público con su documento.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={pending}>Cancelar</AlertDialogCancel>
            <Button onClick={unlink} disabled={pending}>
              {pending && <Spinner data-icon="inline-start" />}
              Desvincular
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
