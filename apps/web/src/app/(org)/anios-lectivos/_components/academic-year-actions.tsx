'use client';

import { useState, useTransition } from 'react';
import {
  CheckCircle2Icon,
  ListOrderedIcon,
  LockIcon,
  LockOpenIcon,
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
import {
  activateAcademicYear,
  deleteAcademicYear,
  setAcademicPeriods,
  setAcademicYearStatus,
  updateAcademicYear,
} from '../actions';
import type { AcademicYear, AcademicYearActionResult } from '../types';
import { AcademicYearForm } from './academic-year-form';

type Confirm = 'close' | 'delete';

export function AcademicYearActions({
  year,
  canUpdate,
  canDelete,
}: {
  year: AcademicYear;
  canUpdate: boolean;
  canDelete: boolean;
}) {
  const [dialog, setDialog] = useState<'edit' | 'periods' | null>(null);
  const [confirm, setConfirm] = useState<Confirm | null>(null);
  const [pending, startTransition] = useTransition();

  const closed = year.status === 'closed';

  const runAction = (
    action: () => Promise<AcademicYearActionResult>,
    message: string,
  ) =>
    startTransition(async () => {
      const result = await action();
      setConfirm(null);

      if (!result.ok) {
        toast.error(result.message);
        return;
      }

      toast.success(message);
    });

  const confirmCopy = {
    close: {
      title: `¿Cerrar el año lectivo ${year.name}?`,
      description:
        'Se cerrará el ingreso de notas de todos sus periodos y no podrás modificar los periodos. Podrás reabrirlo después.',
      action: 'Cerrar año',
      variant: 'default' as const,
      run: () =>
        runAction(
          () => setAcademicYearStatus(year.id, 'closed'),
          `Se cerró el año lectivo ${year.name}`,
        ),
    },
    delete: {
      title: `¿Eliminar el año lectivo ${year.name}?`,
      description: 'Se eliminarán también sus periodos.',
      action: 'Eliminar',
      variant: 'destructive' as const,
      run: () =>
        runAction(
          () => deleteAcademicYear(year.id),
          `Se eliminó el año lectivo ${year.name}`,
        ),
    },
  };

  const current = confirm && confirmCopy[confirm];

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label={`Acciones del año ${year.name}`}
              disabled={pending}
            />
          }
        >
          <MoreHorizontalIcon />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="min-w-48">
          {canUpdate && (
            <>
              <DropdownMenuItem onClick={() => setDialog('edit')}>
                <PencilIcon />
                Editar datos
              </DropdownMenuItem>
              <DropdownMenuItem
                disabled={closed}
                onClick={() => setDialog('periods')}
              >
                <ListOrderedIcon />
                Editar periodos
              </DropdownMenuItem>
              {!year.isActive && (
                <DropdownMenuItem
                  onClick={() =>
                    runAction(
                      () => activateAcademicYear(year.id),
                      `${year.name} es ahora el año activo`,
                    )
                  }
                >
                  <CheckCircle2Icon />
                  Marcar como activo
                </DropdownMenuItem>
              )}
              {closed ? (
                <DropdownMenuItem
                  onClick={() =>
                    runAction(
                      () => setAcademicYearStatus(year.id, 'open'),
                      `Se reabrió el año lectivo ${year.name}`,
                    )
                  }
                >
                  <LockOpenIcon />
                  Reabrir año
                </DropdownMenuItem>
              ) : (
                <DropdownMenuItem onClick={() => setConfirm('close')}>
                  <LockIcon />
                  Cerrar año
                </DropdownMenuItem>
              )}
            </>
          )}
          {canUpdate && canDelete && <DropdownMenuSeparator />}
          {canDelete && (
            <DropdownMenuItem
              variant="destructive"
              disabled={year.isActive}
              onClick={() => setConfirm('delete')}
            >
              <Trash2Icon />
              {year.isActive ? 'Es el año activo' : 'Eliminar'}
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {canUpdate && (
        <Dialog
          open={!!dialog}
          onOpenChange={(open) => !open && setDialog(null)}
        >
          <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
            <DialogHeader>
              <DialogTitle>
                {dialog === 'periods' ? 'Periodos de' : 'Editar'} {year.name}
              </DialogTitle>
              <DialogDescription>
                {dialog === 'periods'
                  ? 'Quitar un periodo lo elimina; los demás conservan su configuración.'
                  : 'Nombre y fechas del año lectivo.'}
              </DialogDescription>
            </DialogHeader>
            {dialog === 'edit' && (
              <AcademicYearForm
                mode="edit"
                action={updateAcademicYear.bind(null, year.id)}
                initialValues={{
                  name: year.name,
                  startDate: year.startDate,
                  endDate: year.endDate,
                }}
                onDone={() => setDialog(null)}
              />
            )}
            {dialog === 'periods' && (
              <AcademicYearForm
                mode="periods"
                action={setAcademicPeriods.bind(null, year.id)}
                initialPeriods={year.periods.map((period) => ({
                  key: period.id,
                  id: period.id,
                  name: period.name,
                  weightPercentage: String(period.weightPercentage),
                }))}
                onDone={() => setDialog(null)}
              />
            )}
          </DialogContent>
        </Dialog>
      )}

      <AlertDialog
        open={!!current}
        onOpenChange={(open) => !pending && !open && setConfirm(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{current?.title}</AlertDialogTitle>
            <AlertDialogDescription>
              {current?.description}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={pending}>Cancelar</AlertDialogCancel>
            <Button
              variant={current?.variant}
              onClick={current?.run}
              disabled={pending}
            >
              {pending && <Spinner data-icon="inline-start" />}
              {current?.action}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
