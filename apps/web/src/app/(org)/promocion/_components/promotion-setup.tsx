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
import type { PromotionYear } from '../types';

type Params = { sourceYear?: string; classroom?: string; targetYear?: string };

function Picker({
  id,
  label,
  placeholder,
  items,
  value,
  onChange,
}: {
  id: string;
  label: string;
  placeholder: string;
  items: { value: string; label: string }[];
  value: string | undefined;
  onChange: (value: string) => void;
}) {
  return (
    <Field>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <Select
        items={items}
        value={value ?? null}
        onValueChange={(next) => onChange(String(next))}
        disabled={!items.length}
      >
        <SelectTrigger id={id} className="w-full">
          <SelectValue
            placeholder={items.length ? placeholder : 'Sin opciones'}
          />
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

// Paso 1: año y salón de origen y año destino; la selección vive en la URL.
export function PromotionSetup({
  years,
  classrooms,
  sourceYearId,
  classroomId,
  targetYearId,
}: {
  years: PromotionYear[];
  classrooms: { id: string; name: string; gradeName: string | null }[];
  sourceYearId: string | undefined;
  classroomId: string | undefined;
  targetYearId: string | undefined;
}) {
  const router = useRouter();
  const sourceYear = years.find(({ id }) => id === sourceYearId);

  const navigate = (next: Params) => {
    const params = new URLSearchParams(
      Object.entries(next).filter(([, value]) => value) as [string, string][],
    );
    router.push(params.size ? `/promocion?${params}` : '/promocion');
  };

  // Solo años abiertos que empiezan después del de origen.
  const targets = years.filter(
    ({ startDate, status }) =>
      status === 'open' && !!sourceYear && startDate > sourceYear.startDate,
  );

  return (
    <FieldGroup className="grid gap-4 md:grid-cols-3">
      <Picker
        id="sourceYear"
        label="Año de origen"
        placeholder="Elige el año"
        items={years.map(({ id, name }) => ({ value: id, label: name }))}
        value={sourceYearId}
        onChange={(sourceYear) => navigate({ sourceYear })}
      />
      <Picker
        id="sourceClassroom"
        label="Salón de origen"
        placeholder="Elige el salón"
        items={classrooms.map(({ id, name, gradeName }) => ({
          value: id,
          label: gradeName ? `${name} · ${gradeName}` : name,
        }))}
        value={classroomId}
        onChange={(classroom) =>
          navigate({
            sourceYear: sourceYearId,
            classroom,
            targetYear: targetYearId,
          })
        }
      />
      <Picker
        id="targetYear"
        label="Año destino"
        placeholder="Elige el año"
        items={targets.map(({ id, name }) => ({ value: id, label: name }))}
        value={
          targets.some(({ id }) => id === targetYearId)
            ? targetYearId
            : undefined
        }
        onChange={(targetYear) =>
          navigate({
            sourceYear: sourceYearId,
            classroom: classroomId,
            targetYear,
          })
        }
      />
    </FieldGroup>
  );
}
