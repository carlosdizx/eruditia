'use client';

import { useState, useTransition } from 'react';
import { MoreHorizontalIcon, PencilIcon, Trash2Icon } from 'lucide-react';
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
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Spinner } from '@/components/ui/spinner';
import { deleteUser, updateUser } from '../actions';
import type { AssignableRole, OrganizationUser } from '../types';
import { UserForm } from './user-form';

type UserRowActionsProps = {
  user: OrganizationUser;
  roles: AssignableRole[];
  isSelf: boolean;
  canUpdate: boolean;
  canDelete: boolean;
};

export function UserRowActions({
  user,
  roles,
  isSelf,
  canUpdate,
  canDelete,
}: UserRowActionsProps) {
  const [editOpen, setEditOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  const fullName = `${user.firstName} ${user.lastName}`;

  const onDelete = () =>
    startTransition(async () => {
      const result = await deleteUser(user.id);

      if (!result.ok) {
        toast.error(result.message);
        return;
      }

      setConfirmOpen(false);
      toast.success(`Se eliminó a ${fullName}`);
    });

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
          {canUpdate && (
            <DropdownMenuItem onClick={() => setEditOpen(true)}>
              <PencilIcon />
              Editar
            </DropdownMenuItem>
          )}
          {canUpdate && canDelete && <DropdownMenuSeparator />}
          {canDelete && (
            <DropdownMenuItem
              variant="destructive"
              disabled={isSelf}
              onClick={() => setConfirmOpen(true)}
            >
              <Trash2Icon />
              {isSelf ? 'No puedes eliminarte' : 'Eliminar'}
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {canUpdate && (
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
                roleId: user.role?.id ?? '',
                isActive: user.isActive ? 'on' : 'off',
              }}
              onDone={() => setEditOpen(false)}
            />
          </DialogContent>
        </Dialog>
      )}

      {canDelete && (
        <AlertDialog
          open={confirmOpen}
          onOpenChange={(open) => !pending && setConfirmOpen(open)}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>¿Eliminar a {fullName}?</AlertDialogTitle>
              <AlertDialogDescription>
                Perderá el acceso de inmediato y dejará de aparecer en el
                listado.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={pending}>Cancelar</AlertDialogCancel>
              <Button
                variant="destructive"
                onClick={onDelete}
                disabled={pending}
              >
                {pending && <Spinner data-icon="inline-start" />}
                Eliminar
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </>
  );
}
