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
import { AccessPinReveal } from './access-pin-reveal';
import { StudentForm } from './student-form';

export function CreateStudentDialog() {
  const [open, setOpen] = useState(false);
  // Matriculado sin cuenta: se muestra su PIN antes de cerrar.
  const [created, setCreated] = useState<{
    name: string;
    accessPin: string;
  } | null>(null);

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setCreated(null);
      }}
    >
      <DialogTrigger render={<Button />}>
        <UserPlusIcon data-icon="inline-start" />
        Nuevo estudiante
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>
            {created ? 'Estudiante matriculado' : 'Nuevo estudiante'}
          </DialogTitle>
          <DialogDescription>
            {created
              ? created.name
              : 'No necesita correo: puede consultar con su documento y un PIN, o tener su propia cuenta.'}
          </DialogDescription>
        </DialogHeader>
        {created ? (
          <AccessPinReveal
            studentName={created.name}
            accessPin={created.accessPin}
          />
        ) : (
          <StudentForm
            mode="create"
            action={createStudent}
            onDone={({ accessPin, name }) =>
              accessPin && name
                ? setCreated({ name, accessPin })
                : setOpen(false)
            }
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
