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
import { createGradeLevel } from '../actions';
import { GradeLevelForm } from './grade-level-form';

export function CreateGradeLevelDialog({ nextOrder }: { nextOrder: number }) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button />}>
        <PlusIcon data-icon="inline-start" />
        Nuevo grado
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Nuevo grado</DialogTitle>
          <DialogDescription>
            Los grados se reutilizan cada año lectivo.
          </DialogDescription>
        </DialogHeader>
        <GradeLevelForm
          mode="create"
          action={createGradeLevel}
          initialValues={{ sequenceOrder: String(nextOrder) }}
          onDone={() => setOpen(false)}
        />
      </DialogContent>
    </Dialog>
  );
}
