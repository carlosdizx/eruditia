'use client';

import { useOptimistic, useTransition } from 'react';
import { toast } from 'sonner';
import { Switch } from '@/components/ui/switch';
import { setPeriodGrading } from '../actions';
import type { AcademicPeriod } from '../types';

export function PeriodGradingSwitch({
  yearId,
  period,
  disabled,
}: {
  yearId: string;
  period: AcademicPeriod;
  disabled: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [open, setOpen] = useOptimistic(period.isOpenForGrading);

  const onChange = (next: boolean) =>
    startTransition(async () => {
      setOpen(next);
      const result = await setPeriodGrading(yearId, period.id, next);

      if (!result.ok) {
        toast.error(result.message);
        return;
      }

      toast.success(
        next
          ? `${period.name}: ingreso de notas abierto`
          : `${period.name}: ingreso de notas cerrado`,
      );
    });

  return (
    <Switch
      checked={open}
      onCheckedChange={onChange}
      disabled={disabled || pending}
      aria-label={`Ingreso de notas de ${period.name}`}
    />
  );
}
