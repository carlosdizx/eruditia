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

export type RankingFilter = {
  // Parámetro de la URL que controla.
  param: string;
  label: string;
  items: Item[];
  value: string;
};

// Filtros del ranking; la selección vive en la URL. Cambiar uno conserva los
// demás salvo los que se listen en resets.
export function RankingFilters({
  filters,
  base,
  resets = {},
  path = '/ranking',
}: {
  filters: RankingFilter[];
  // Parámetros fijos de la vista (ej. vista=materia).
  base: Record<string, string>;
  resets?: Record<string, string[]>;
  path?: string;
}) {
  const router = useRouter();
  const navigate = (param: string, value: string) => {
    const params = Object.fromEntries([
      ...Object.entries(base),
      ...filters
        .filter(
          (filter) =>
            filter.param !== param && !resets[param]?.includes(filter.param),
        )
        .map((filter) => [filter.param, filter.value]),
      [param, value],
    ]);
    router.push(`${path}?${new URLSearchParams(params)}`);
  };

  return (
    <FieldGroup className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {filters.map(({ param, label, items, value }) => (
        <Field key={param}>
          <FieldLabel htmlFor={`ranking-${param}`}>{label}</FieldLabel>
          <Select
            items={items}
            value={value}
            onValueChange={(next) => navigate(param, String(next))}
          >
            <SelectTrigger id={`ranking-${param}`} className="w-full">
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
      ))}
    </FieldGroup>
  );
}
