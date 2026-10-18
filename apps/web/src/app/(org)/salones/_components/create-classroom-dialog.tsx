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
import { createClassroom } from '../actions';
import type { GradeLevelOption, Teacher } from '../types';
import { ClassroomForm } from './classroom-form';

export function CreateClassroomDialog({
  academicYear,
  gradeLevels,
  teachers,
  usedNames,
}: {
  academicYear: { id: string; name: string };
  gradeLevels: GradeLevelOption[];
  teachers: Teacher[];
  usedNames: string[];
}) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button />}>
        <PlusIcon data-icon="inline-start" />
        Nuevo salón
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Nuevo salón</DialogTitle>
          <DialogDescription>
            Para el año lectivo {academicYear.name}.
          </DialogDescription>
        </DialogHeader>
        <ClassroomForm
          mode="create"
          action={createClassroom.bind(null, academicYear.id)}
          gradeLevels={gradeLevels}
          teachers={teachers}
          usedNames={usedNames}
          onDone={() => setOpen(false)}
        />
      </DialogContent>
    </Dialog>
  );
}
