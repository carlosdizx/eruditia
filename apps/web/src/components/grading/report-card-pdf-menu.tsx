'use client';

import { ChevronDownIcon, FileDownIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

type Period = { id: string; name: string };

// Descarga del boletín en PDF: el informe final o el de un periodo. href es
// un route handler GET al que se le agrega ?periodo=. prominent: botón grande
// para el portal público.
export function ReportCardPdfMenu({
  periods,
  href,
  label = 'Descargar PDF',
  prominent = false,
}: {
  periods: Period[];
  href: string;
  label?: string;
  prominent?: boolean;
}) {
  const download = (periodId?: string) => {
    const url = new URL(href, window.location.origin);
    if (periodId) url.searchParams.set('periodo', periodId);
    window.location.assign(url);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          prominent ? (
            <Button size="lg" className="h-12 w-full text-base sm:w-auto" />
          ) : (
            <Button variant="outline" size="sm" />
          )
        }
      >
        <FileDownIcon data-icon="inline-start" />
        {label}
        <ChevronDownIcon data-icon="inline-end" />
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className={prominent ? 'min-w-64 text-base' : 'min-w-48'}
      >
        <DropdownMenuItem onClick={() => download()}>
          Informe final (todo el año)
        </DropdownMenuItem>
        {periods.length > 0 && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuLabel>Boletín de un periodo</DropdownMenuLabel>
              {periods.map((period) => (
                <DropdownMenuItem
                  key={period.id}
                  onClick={() => download(period.id)}
                >
                  {period.name}
                </DropdownMenuItem>
              ))}
            </DropdownMenuGroup>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
