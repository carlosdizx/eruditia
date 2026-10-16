'use client';

import { useRouter } from 'next/navigation';
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

type Item = { value: string; label: string };

function Picker({
  id,
  label,
  items,
  value,
  onChange,
}: {
  id: string;
  label: string;
  items: Item[];
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <Field>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <Select
        items={items}
        value={value}
        onValueChange={(next) => onChange(String(next))}
      >
        <SelectTrigger id={id} className="w-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {items.map((item) => (
            <SelectItem key={item.value} value={item.value}>
              {item.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </Field>
  );
}

// Salón y periodo del ranking; la selección vive en la URL.
export function RankingFilters({
  classrooms,
  periods,
  classroomId,
  periodValue,
}: {
  classrooms: Item[];
  periods: Item[];
  classroomId: string;
  periodValue: string;
}) {
  const router = useRouter();
  const navigate = (salon: string, periodo: string) =>
    router.push(`/ranking?${new URLSearchParams({ salon, periodo })}`);

  return (
    <FieldGroup className="grid gap-4 sm:grid-cols-2 lg:max-w-2xl">
      <Picker
        id="rankingClassroom"
        label="Salón"
        items={classrooms}
        value={classroomId}
        onChange={(salon) => navigate(salon, periodValue)}
      />
      <Picker
        id="rankingPeriod"
        label="Periodo"
        items={periods}
        value={periodValue}
        onChange={(periodo) => navigate(classroomId, periodo)}
      />
    </FieldGroup>
  );
}
