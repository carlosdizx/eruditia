'use client';

import { useRouter } from 'next/navigation';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DELETED_FILTERS, type DeletedFilter } from '../types';

export function OrganizationsFilter({
  value,
  basePath,
}: {
  value: DeletedFilter;
  basePath: string;
}) {
  const router = useRouter();

  return (
    <Tabs
      value={value}
      onValueChange={(next: DeletedFilter) =>
        router.push(
          next === 'exclude' ? basePath : `${basePath}?deleted=${next}`,
        )
      }
    >
      <TabsList>
        {DELETED_FILTERS.map((filter) => (
          <TabsTrigger key={filter.value} value={filter.value}>
            {filter.label}
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  );
}
