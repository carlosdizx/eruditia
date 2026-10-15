'use client';

import { useOptimistic, useTransition } from 'react';
import { CalendarRangeIcon } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { selectAcademicYear } from '@/lib/academic-year/actions';
import type { AcademicYearOption } from '@/lib/academic-year/selected-year';

export function AcademicYearSelect({
  years,
  selectedId,
}: {
  years: AcademicYearOption[];
  selectedId: string;
}) {
  const [pending, startTransition] = useTransition();
  const [value, setValue] = useOptimistic(selectedId);

  const items = years.map((year) => ({
    value: year.id,
    label: [
      year.name,
      year.isActive && '(activo)',
      year.status === 'closed' && '· cerrado',
    ]
      .filter(Boolean)
      .join(' '),
  }));

  return (
    <Select
      items={items}
      value={value}
      onValueChange={(next) =>
        startTransition(async () => {
          setValue(String(next));
          await selectAcademicYear(String(next));
        })
      }
      disabled={pending}
    >
      <SelectTrigger size="sm" className="w-44" aria-label="Año lectivo">
        <CalendarRangeIcon className="text-muted-foreground" />
        <SelectValue />
      </SelectTrigger>
      <SelectContent align="end">
        {items.map((item) => (
          <SelectItem key={item.value} value={item.value}>
            {item.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
