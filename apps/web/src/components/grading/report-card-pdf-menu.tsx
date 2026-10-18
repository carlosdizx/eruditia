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

// Descarga del boletín en PDF: el informe final o el de un periodo.
// href: route handler GET (se le agrega ?periodo=); form: POST del portal con
// documento + PIN, que no deben ir en la URL.
export function ReportCardPdfMenu({
  periods,
  href,
  form,
  label = 'Descargar PDF',
}: {
  periods: Period[];
  href?: string;
  form?: { action: string; fields: Record<string, string | undefined> };
  label?: string;
}) {
  const download = (periodId?: string) => {
    if (href) {
      const url = new URL(href, window.location.origin);
      if (periodId) url.searchParams.set('periodo', periodId);
      window.location.assign(url);
      return;
    }
    if (!form) return;
    const element = document.createElement('form');
    element.method = 'POST';
    element.action = form.action;
    element.target = '_blank';
    Object.entries({ ...form.fields, periodId }).forEach(([name, value]) => {
      if (!value) return;
      const input = document.createElement('input');
      input.type = 'hidden';
      input.name = name;
      input.value = value;
      element.append(input);
    });
    document.body.append(element);
    element.submit();
    element.remove();
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={<Button variant="outline" size="sm" />}>
        <FileDownIcon data-icon="inline-start" />
        {label}
        <ChevronDownIcon data-icon="inline-end" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-48">
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
