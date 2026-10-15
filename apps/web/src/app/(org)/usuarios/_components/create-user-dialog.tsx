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
import { createUser } from '../actions';
import type { AssignableRole } from '../types';
import { UserForm } from './user-form';

export function CreateUserDialog({ roles }: { roles: AssignableRole[] }) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button />}>
        <UserPlusIcon data-icon="inline-start" />
        Nuevo usuario
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Nuevo usuario</DialogTitle>
          <DialogDescription>
            Se agrega a tu organización con el rol que elijas.
          </DialogDescription>
        </DialogHeader>
        <UserForm
          mode="create"
          action={createUser}
          roles={roles}
          onDone={() => setOpen(false)}
        />
      </DialogContent>
    </Dialog>
  );
}
