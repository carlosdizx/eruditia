'use client';

import { useState } from 'react';
import { PlusIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { createAcademicYear } from '../actions';
import { AcademicYearForm } from './academic-year-form';
import { defaultPeriods } from './periods-editor';

export function CreateAcademicYearDialog({
  suggestedName,
}: {
  suggestedName: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button />}>
        <PlusIcon data-icon="inline-start" />
        Nuevo año lectivo
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Nuevo año lectivo</DialogTitle>
          <DialogDescription>
            Salones, matrículas y notas quedan asociados a este año, así se
            conserva el historial.
          </DialogDescription>
        </DialogHeader>
        <AcademicYearForm
          mode="create"
          action={createAcademicYear}
          initialValues={{ name: suggestedName }}
          initialPeriods={defaultPeriods()}
          onDone={() => setOpen(false)}
        />
      </DialogContent>
    </Dialog>
  );
}
