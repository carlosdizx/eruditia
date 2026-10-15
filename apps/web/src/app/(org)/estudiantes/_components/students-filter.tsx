'use client';

import { useRouter } from 'next/navigation';
import { SearchIcon } from 'lucide-react';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { STUDENT_STATUSES, type StudentStatus } from '../types';

const ALL = 'all';

const STATUS_ITEMS = [
  { value: ALL, label: 'Todos los estados' },
  ...STUDENT_STATUSES,
];

export function StudentsFilter({
  basePath,
  search,
  status,
}: {
  basePath: string;
  search: string;
  status: StudentStatus | undefined;
}) {
  const router = useRouter();

  // Cambiar un filtro vuelve a la primera página.
  const navigate = (next: { search?: string; status?: string }) => {
    const params = new URLSearchParams();
    const nextSearch = (next.search ?? search).trim();
    const nextStatus = next.status ?? status ?? ALL;

    if (nextSearch) params.set('search', nextSearch);
    if (nextStatus !== ALL) params.set('status', nextStatus);

    router.push(params.size ? `${basePath}?${params}` : basePath);
  };

  return (
    <div className="flex flex-col gap-2 sm:flex-row">
      <form
        className="relative flex-1"
        onSubmit={(event) => {
          event.preventDefault();
          navigate({
            search: String(new FormData(event.currentTarget).get('search')),
          });
        }}
      >
        <SearchIcon className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2" />
        <Input
          // Se remonta cuando cambia la URL (p. ej. al limpiar el filtro).
          key={search}
          name="search"
          type="search"
          defaultValue={search}
          placeholder="Buscar por nombre, documento o código"
          aria-label="Buscar estudiantes"
          className="pl-8"
        />
      </form>
      <Select
        items={STATUS_ITEMS}
        value={status ?? ALL}
        onValueChange={(value) => navigate({ status: String(value) })}
      >
        <SelectTrigger
          className="w-full sm:w-48"
          aria-label="Filtrar por estado"
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {STATUS_ITEMS.map((item) => (
            <SelectItem key={item.value} value={item.value}>
              {item.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
