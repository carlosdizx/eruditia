'use client';

import { useState } from 'react';
import { UserPlusIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { createStudent } from '../actions';
import { StudentForm } from './student-form';

export function CreateStudentDialog() {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button />}>
        <UserPlusIcon data-icon="inline-start" />
        Nuevo estudiante
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Nuevo estudiante</DialogTitle>
          <DialogDescription>
            No necesita correo: sus notas se consultan en el portal público con
            su documento. La cuenta propia es opcional.
          </DialogDescription>
        </DialogHeader>
        <StudentForm
          mode="create"
          action={createStudent}
          onDone={() => setOpen(false)}
        />
      </DialogContent>
    </Dialog>
  );
}
