'use client';

import { useState } from 'react';
import { MoreHorizontalIcon, PencilIcon } from 'lucide-react';
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
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { updateUser } from '../actions';
import type { AssignableRole, OrganizationUser } from '../types';
import { UserForm } from './user-form';

type UserRowActionsProps = {
  user: OrganizationUser;
  roles: AssignableRole[];
  isSelf: boolean;
};

// Los usuarios no se eliminan: se desactivan desde Editar.
export function UserRowActions({ user, roles, isSelf }: UserRowActionsProps) {
  const [editOpen, setEditOpen] = useState(false);

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
          <DropdownMenuItem onClick={() => setEditOpen(true)}>
            <PencilIcon />
            Editar
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Editar usuario</DialogTitle>
            <DialogDescription>{user.email}</DialogDescription>
          </DialogHeader>
          <UserForm
            mode="edit"
            action={updateUser.bind(null, user.id)}
            roles={roles}
            isSelf={isSelf}
            initialValues={{
              firstName: user.firstName,
              lastName: user.lastName,
              email: user.email,
              documentNumber: user.documentNumber ?? '',
              phone: user.phone ?? '',
              roleId: user.role?.id ?? '',
              isActive: user.isActive ? 'on' : 'off',
            }}
            onDone={() => setEditOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </>
  );
}
