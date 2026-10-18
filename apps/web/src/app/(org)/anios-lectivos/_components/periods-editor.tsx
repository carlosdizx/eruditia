'use client';

import { useState } from 'react';
import { PlusIcon, ScaleIcon, Trash2Icon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import type { PeriodDraft } from '../types';

const MAX_PERIODS = 6;

let nextKey = 0;
const newKey = () => `new-${++nextKey}`;

// Reparte 100% en n partes con dos decimales; el último absorbe el residuo.
const equalWeights = (count: number) => {
  const base = Math.floor(10_000 / count) / 100;
  const last = Math.round((100 - base * (count - 1)) * 100) / 100;
  return Array.from({ length: count }, (_, index) =>
    String(index === count - 1 ? last : base),
  );
};

export const defaultPeriods = (count = 4): PeriodDraft[] =>
  equalWeights(count).map((weightPercentage, index) => ({
    key: newKey(),
    name: `Periodo ${index + 1}`,
    weightPercentage,
  }));

// En centésimas, igual que la API, para no arrastrar errores de punto flotante.
const sumOf = (rows: PeriodDraft[]) =>
  rows.reduce(
    (sum, row) => sum + Math.round((Number(row.weightPercentage) || 0) * 100),
    0,
  ) / 100;

// Envía las filas como JSON en el campo oculto "periods".
export function PeriodsEditor({ initial }: { initial: PeriodDraft[] }) {
  const [rows, setRows] = useState(initial);

  const sum = sumOf(rows);
  const complete = sum === 100;

  const update = (key: string, patch: Partial<PeriodDraft>) =>
    setRows((current) =>
      current.map((row) => (row.key === key ? { ...row, ...patch } : row)),
    );

  const balance = () =>
    setRows((current) => {
      const weights = equalWeights(current.length);
      return current.map((row, index) => ({
        ...row,
        weightPercentage: weights[index],
      }));
    });

  return (
    <div className="flex flex-col gap-3">
      <input type="hidden" name="periods" value={JSON.stringify(rows)} />

      <div className="flex flex-col gap-2">
        {rows.map((row, index) => (
          <div key={row.key} className="flex items-center gap-2">
            <span className="text-muted-foreground w-5 text-right text-sm tabular-nums">
              {index + 1}
            </span>
            <Input
              aria-label={`Nombre del periodo ${index + 1}`}
              value={row.name}
              onChange={(event) =>
                update(row.key, { name: event.target.value })
              }
              required
              maxLength={50}
              className="flex-1"
            />
            <div className="relative w-28">
              <Input
                aria-label={`Porcentaje del periodo ${index + 1}`}
                type="number"
                inputMode="decimal"
                min="0.01"
                max="100"
                step="0.01"
                required
                value={row.weightPercentage}
                onChange={(event) =>
                  update(row.key, { weightPercentage: event.target.value })
                }
                className="pr-7 text-right tabular-nums"
              />
              <span className="text-muted-foreground pointer-events-none absolute top-1/2 right-2.5 -translate-y-1/2 text-sm">
                %
              </span>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label={`Quitar el periodo ${index + 1}`}
              disabled={rows.length === 1}
              onClick={() =>
                setRows((current) =>
                  current.filter(({ key }) => key !== row.key),
                )
              }
            >
              <Trash2Icon />
            </Button>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={rows.length >= MAX_PERIODS}
            onClick={() =>
              setRows((current) => [
                ...current,
                {
                  key: newKey(),
                  name: `Periodo ${current.length + 1}`,
                  weightPercentage: '0',
                },
              ])
            }
          >
            <PlusIcon data-icon="inline-start" />
            Agregar periodo
          </Button>
          <Button type="button" variant="ghost" size="sm" onClick={balance}>
            <ScaleIcon data-icon="inline-start" />
            Repartir igual
          </Button>
        </div>
        <p
          className={cn(
            'text-sm font-medium tabular-nums',
            complete ? 'text-emerald-600' : 'text-destructive',
          )}
          aria-live="polite"
        >
          Total: {sum}% {complete ? '' : '(debe ser 100%)'}
        </p>
      </div>
    </div>
  );
}
