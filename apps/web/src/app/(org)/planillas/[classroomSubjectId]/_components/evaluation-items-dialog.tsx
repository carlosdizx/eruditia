'use client';

import { useState, useTransition } from 'react';
import { ListChecksIcon, PlusIcon, Trash2Icon } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';
import { cn } from '@/lib/utils';
import { setEvaluationItems } from '../../actions';
import type { EvaluationItem } from '../../types';

type Row = { key: string; id?: string; title: string; weight: string };

const MAX_ITEMS = 20;

const toRows = (items: EvaluationItem[]): Row[] =>
  items.map(({ id, title, weightPercentage }) => ({
    key: id,
    id,
    title,
    weight: String(weightPercentage),
  }));

const toNumber = (value: string) => Number(value.trim().replace(',', '.'));

function ItemsEditor({
  classroomSubjectId,
  periodId,
  items,
  onDone,
}: {
  classroomSubjectId: string;
  periodId: string;
  items: EvaluationItem[];
  onDone: () => void;
}) {
  const [rows, setRows] = useState(() => toRows(items));
  const [pending, startTransition] = useTransition();

  const total =
    Math.round(
      rows.reduce((sum, { weight }) => sum + (toNumber(weight) || 0), 0) * 100,
    ) / 100;
  const valid =
    rows.length > 0 &&
    total === 100 &&
    rows.every(
      ({ title, weight }) =>
        title.trim() && toNumber(weight) > 0 && toNumber(weight) <= 100,
    );
  const removed = items.filter(
    ({ id }) => !rows.some((row) => row.id === id),
  ).length;

  const update = (key: string, patch: Partial<Row>) =>
    setRows((current) =>
      current.map((row) => (row.key === key ? { ...row, ...patch } : row)),
    );

  // Reparte el 100% en partes iguales (la última absorbe el redondeo).
  const splitEvenly = () =>
    setRows((current) => {
      const share = Math.floor((100 / current.length) * 100) / 100;
      return current.map((row, index) => ({
        ...row,
        weight: String(
          index === current.length - 1
            ? Math.round((100 - share * (current.length - 1)) * 100) / 100
            : share,
        ),
      }));
    });

  const save = () =>
    startTransition(async () => {
      const result = await setEvaluationItems(
        classroomSubjectId,
        periodId,
        rows.map(({ id, title, weight }) => ({
          ...(id && { id }),
          title: title.trim(),
          weightPercentage: toNumber(weight),
        })),
      );
      if (!result.ok) {
        toast.error(result.message);
        return;
      }
      toast.success(result.message);
      onDone();
    });

  return (
    <div className="flex flex-col gap-4">
      <ul className="flex flex-col gap-2">
        {rows.map((row, index) => (
          <li key={row.key} className="flex items-center gap-2">
            <span className="text-muted-foreground w-5 text-sm tabular-nums">
              {index + 1}
            </span>
            <Input
              aria-label={`Nombre de la actividad ${index + 1}`}
              placeholder="Ej. Examen parcial"
              maxLength={100}
              value={row.title}
              onChange={(event) =>
                update(row.key, { title: event.target.value })
              }
            />
            <div className="relative w-24 shrink-0">
              <Input
                aria-label={`Peso de la actividad ${index + 1}`}
                inputMode="decimal"
                className="pr-6 text-right tabular-nums"
                value={row.weight}
                onChange={(event) =>
                  update(row.key, { weight: event.target.value })
                }
              />
              <span className="text-muted-foreground pointer-events-none absolute top-1/2 right-2 -translate-y-1/2 text-sm">
                %
              </span>
            </div>
            <Button
              variant="ghost"
              size="icon"
              aria-label={`Quitar ${row.title || `actividad ${index + 1}`}`}
              disabled={rows.length === 1}
              onClick={() =>
                setRows((current) =>
                  current.filter(({ key }) => key !== row.key),
                )
              }
            >
              <Trash2Icon />
            </Button>
          </li>
        ))}
      </ul>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={rows.length >= MAX_ITEMS}
            onClick={() =>
              setRows((current) => [
                ...current,
                { key: crypto.randomUUID(), title: '', weight: '' },
              ])
            }
          >
            <PlusIcon data-icon="inline-start" />
            Agregar actividad
          </Button>
          <Button variant="ghost" size="sm" onClick={splitEvenly}>
            Repartir en partes iguales
          </Button>
        </div>
        <span
          className={cn(
            'text-sm font-medium tabular-nums',
            total === 100
              ? 'text-emerald-600 dark:text-emerald-400'
              : 'text-destructive',
          )}
        >
          Total: {total}%
        </span>
      </div>

      {removed > 0 && (
        <p className="border-destructive/30 bg-destructive/10 text-destructive rounded-lg border px-3 py-2 text-sm">
          Vas a quitar {removed} {removed === 1 ? 'actividad' : 'actividades'}:
          se borrarán sus notas y se recalcularán las definitivas.
        </p>
      )}

      <DialogFooter>
        <DialogClose
          render={<Button variant="outline" type="button" />}
          disabled={pending}
        >
          Cancelar
        </DialogClose>
        <Button onClick={save} disabled={!valid || pending}>
          {pending && <Spinner data-icon="inline-start" />}
          Guardar actividades
        </Button>
      </DialogFooter>
    </div>
  );
}

export function EvaluationItemsDialog({
  classroomSubjectId,
  periodId,
  items,
  disabled,
}: {
  classroomSubjectId: string;
  periodId: string;
  items: EvaluationItem[];
  disabled: boolean;
}) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button
            variant="outline"
            disabled={disabled}
            title={
              disabled
                ? 'Guarda las notas antes de cambiar las actividades'
                : undefined
            }
          />
        }
      >
        <ListChecksIcon data-icon="inline-start" />
        Actividades ({items.length})
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Actividades del periodo</DialogTitle>
          <DialogDescription>
            Cada actividad es una columna de la planilla. Sus pesos deben sumar
            100%; si prefieres digitar la definitiva directamente, deja una sola
            actividad del 100%.
          </DialogDescription>
        </DialogHeader>
        {open && (
          <ItemsEditor
            classroomSubjectId={classroomSubjectId}
            periodId={periodId}
            items={items}
            onDone={() => setOpen(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
