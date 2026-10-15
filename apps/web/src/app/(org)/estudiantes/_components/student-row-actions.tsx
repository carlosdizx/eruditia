'use client';

import { useState, useTransition } from 'react';
import { MoreHorizontalIcon, PencilIcon, RefreshCwIcon } from 'lucide-react';
import { toast } from 'sonner';
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
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { changeStudentStatus, updateStudent } from '../actions';
import {
  STUDENT_STATUS_LABELS,
  STUDENT_STATUSES,
  type Student,
  type StudentStatus,
} from '../types';
import { StudentForm } from './student-form';

export function StudentRowActions({ student }: { student: Student }) {
  const [editOpen, setEditOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  const fullName = `${student.firstName} ${student.lastName}`;

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
        <DropdownMenuContent align="end" className="min-w-40">
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
    </>
  );
}
