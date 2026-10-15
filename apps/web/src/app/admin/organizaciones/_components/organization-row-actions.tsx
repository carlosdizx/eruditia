'use client';

import Link from 'next/link';
import { useState, useTransition } from 'react';
import {
  ArchiveRestoreIcon,
  KeyRoundIcon,
  MoreHorizontalIcon,
  PencilIcon,
  Trash2Icon,
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Spinner } from '@/components/ui/spinner';
import { deleteOrganization, restoreOrganization } from '../actions';

type OrganizationRowActionsProps = {
  id: string;
  name: string;
  deleted: boolean;
};

export function OrganizationRowActions({
  id,
  name,
  deleted,
}: OrganizationRowActionsProps) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  const onDelete = () =>
    startTransition(async () => {
      const result = await deleteOrganization(id);

      if (!result.ok) {
        toast.error(result.message);
        return;
      }

      setConfirmOpen(false);
      toast.success(`Se eliminó ${name}`);
    });

  const onRestore = () =>
    startTransition(async () => {
      const result = await restoreOrganization(id);

      if (result.ok) toast.success(`Se restauró ${name}`);
      else toast.error(result.message);
    });

  // Una organización eliminada no se puede consultar ni editar hasta
  // restaurarla.
  if (deleted)
    return (
      <Button variant="ghost" size="sm" onClick={onRestore} disabled={pending}>
        {pending ? (
          <Spinner data-icon="inline-start" />
        ) : (
          <ArchiveRestoreIcon data-icon="inline-start" />
        )}
        Restaurar
      </Button>
    );

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
          <DropdownMenuItem
            render={<Link href={`/admin/organizaciones/${id}`} />}
          >
            <PencilIcon />
            Editar
          </DropdownMenuItem>
          <DropdownMenuItem
            render={<Link href={`/admin/organizaciones/${id}/permisos`} />}
          >
            <KeyRoundIcon />
            Permisos
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            variant="destructive"
            onClick={() => setConfirmOpen(true)}
          >
            <Trash2Icon />
            Eliminar
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog
        open={confirmOpen}
        onOpenChange={(open) => !pending && setConfirmOpen(open)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar {name}?</AlertDialogTitle>
            <AlertDialogDescription>
              Sus usuarios perderán el acceso. Podrás restaurarla desde la
              pestaña Eliminadas.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={pending}>Cancelar</AlertDialogCancel>
            <Button variant="destructive" onClick={onDelete} disabled={pending}>
              {pending && <Spinner data-icon="inline-start" />}
              Eliminar
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
