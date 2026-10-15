'use client';

import { useState, useTransition } from 'react';
import {
  KeyRoundIcon,
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
  regenerateStudentPin,
  unlinkStudentAccount,
  updateStudent,
} from '../actions';
import {
  STUDENT_STATUS_LABELS,
  STUDENT_STATUSES,
  type Student,
  type StudentPinResult,
  type StudentStatus,
} from '../types';
import { AccessPinReveal } from './access-pin-reveal';
import { LinkAccountForm } from './link-account-form';
import { StudentForm } from './student-form';

type Confirm = 'regenerate-pin' | 'unlink-account';

export function StudentRowActions({ student }: { student: Student }) {
  const [editOpen, setEditOpen] = useState(false);
  const [linkOpen, setLinkOpen] = useState(false);
  const [confirm, setConfirm] = useState<Confirm | null>(null);
  const [revealedPin, setRevealedPin] = useState<string | null>(null);
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

  const runPinAction = (action: () => Promise<StudentPinResult>) =>
    startTransition(async () => {
      const result = await action();
      setConfirm(null);

      if (!result.ok) {
        toast.error(result.message);
        return;
      }

      setRevealedPin(result.accessPin);
    });

  const confirmCopy: Record<
    Confirm,
    { title: string; description: string; action: string; run: () => void }
  > = {
    'regenerate-pin': {
      title: student.hasAccessPin
        ? `¿Generar un PIN nuevo para ${fullName}?`
        : `¿Generar el PIN de ${fullName}?`,
      description: student.hasAccessPin
        ? 'El PIN actual dejará de funcionar de inmediato.'
        : 'Podrá consultar sus notas con su documento y este PIN.',
      action: 'Generar PIN',
      run: () => runPinAction(() => regenerateStudentPin(student.id)),
    },
    'unlink-account': {
      title: `¿Desvincular la cuenta de ${fullName}?`,
      description: `La cuenta ${student.user?.email ?? ''} se desactivará y el estudiante pasará a consultar sus notas con su documento y un PIN nuevo.`,
      action: 'Desvincular',
      run: () => runPinAction(() => unlinkStudentAccount(student.id)),
    },
  };

  const current = confirm && confirmCopy[confirm];

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
            <DropdownMenuItem onClick={() => setConfirm('unlink-account')}>
              <UnlinkIcon />
              Desvincular cuenta
            </DropdownMenuItem>
          ) : (
            <>
              <DropdownMenuItem onClick={() => setConfirm('regenerate-pin')}>
                <KeyRoundIcon />
                {student.hasAccessPin ? 'Generar nuevo PIN' : 'Generar PIN'}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setLinkOpen(true)}>
                <LinkIcon />
                Vincular cuenta de acceso
              </DropdownMenuItem>
            </>
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
              {fullName} iniciará sesión con su correo y su PIN dejará de
              funcionar.
            </DialogDescription>
          </DialogHeader>
          <LinkAccountForm
            action={linkStudentAccount.bind(null, student.id)}
            onDone={() => setLinkOpen(false)}
          />
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={!!current}
        onOpenChange={(open) => !pending && !open && setConfirm(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{current?.title}</AlertDialogTitle>
            <AlertDialogDescription>
              {current?.description}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={pending}>Cancelar</AlertDialogCancel>
            <Button onClick={current?.run} disabled={pending}>
              {pending && <Spinner data-icon="inline-start" />}
              {current?.action}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog
        open={!!revealedPin}
        onOpenChange={(open) => !open && setRevealedPin(null)}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Nuevo PIN</DialogTitle>
            <DialogDescription>{fullName}</DialogDescription>
          </DialogHeader>
          {revealedPin && (
            <AccessPinReveal studentName={fullName} accessPin={revealedPin} />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
