'use client';

import { useActionState, useState } from 'react';
import {
  CircleAlertIcon,
  CircleCheckIcon,
  DownloadIcon,
  FileUpIcon,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Field, FieldDescription, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { importStudents } from '../actions';
import type { StudentsImportState, StudentsImportSummary } from '../types';

// Mismas columnas que espera la API (students-csv.util.ts).
const TEMPLATE = [
  'documento,tipo_documento,nombres,apellidos,fecha_nacimiento,nombre_acudiente,telefono_acudiente,correo_acudiente',
  '1012345678,TI,Sofía,Pérez Gómez,2014-03-21,Marta Gómez,3001234567,marta@example.com',
  '1098765432,RC,Juan,Díaz,2018-11-02,,,',
].join('\r\n');

// El BOM hace que Excel abra el archivo en UTF-8 (tildes y eñes).
const downloadTemplate = () => {
  const url = URL.createObjectURL(
    new Blob(['﻿', TEMPLATE], { type: 'text/csv;charset=utf-8' }),
  );
  const link = document.createElement('a');
  link.href = url;
  link.download = 'plantilla-estudiantes.csv';
  link.click();
  URL.revokeObjectURL(url);
};

function ImportSummary({ summary }: { summary: StudentsImportSummary }) {
  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-3 gap-2 text-center">
        {[
          { label: 'Filas', value: summary.total },
          { label: 'Importados', value: summary.created },
          { label: 'Con errores', value: summary.failed },
        ].map(({ label, value }) => (
          <div key={label} className="rounded-lg border px-3 py-2">
            <div className="text-2xl font-semibold tabular-nums">{value}</div>
            <div className="text-muted-foreground text-xs">{label}</div>
          </div>
        ))}
      </div>

      {summary.failed ? (
        <div className="max-h-64 overflow-y-auto rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-16 pl-3">Línea</TableHead>
                <TableHead>Documento</TableHead>
                <TableHead className="pr-3">Problema</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {summary.errors.map((error) => (
                <TableRow key={error.line}>
                  <TableCell className="pl-3 tabular-nums">
                    {error.line}
                  </TableCell>
                  <TableCell>{error.documentNumber ?? '—'}</TableCell>
                  <TableCell className="pr-3 whitespace-normal">
                    {error.messages.join('. ')}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : (
        <p className="flex items-center gap-2 text-sm">
          <CircleCheckIcon className="size-4 text-emerald-600" />
          Todas las filas se importaron correctamente.
        </p>
      )}
    </div>
  );
}

// Se monta cada vez que se abre el diálogo, así el estado empieza limpio.
function ImportStudentsForm({ onReset }: { onReset: () => void }) {
  const [state, formAction, pending] = useActionState<
    StudentsImportState,
    FormData
  >(importStudents, { status: 'idle' });

  if (state.status === 'done')
    return (
      <>
        <ImportSummary summary={state.summary} />
        <DialogFooter>
          <Button variant="outline" type="button" onClick={onReset}>
            Importar otro archivo
          </Button>
          <DialogClose render={<Button type="button" />}>Listo</DialogClose>
        </DialogFooter>
      </>
    );

  return (
    <form action={formAction} className="flex flex-col gap-6">
      {state.status === 'error' && (
        <div
          role="alert"
          className="border-destructive/30 bg-destructive/10 text-destructive flex items-start gap-2 rounded-lg border px-3 py-2 text-sm"
        >
          <CircleAlertIcon className="mt-0.5 size-4 shrink-0" />
          {state.message}
        </div>
      )}

      <div className="bg-muted/50 flex flex-col gap-3 rounded-lg border p-3 text-sm sm:flex-row sm:items-center sm:justify-between">
        <p className="text-muted-foreground">
          Llena la plantilla en Excel y guárdala como CSV. Columnas
          obligatorias: documento, tipo_documento (RC, TI, CC u OTRO), nombres y
          apellidos.
        </p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={downloadTemplate}
          className="shrink-0"
        >
          <DownloadIcon data-icon="inline-start" />
          Plantilla
        </Button>
      </div>

      <Field>
        <FieldLabel htmlFor="file">Archivo CSV</FieldLabel>
        <Input
          id="file"
          name="file"
          type="file"
          accept=".csv,text/csv"
          required
        />
        <FieldDescription>
          Hasta 2000 estudiantes. El código estudiantil será el número de
          documento. Las filas con errores o documentos repetidos se omiten y se
          listan al final.
        </FieldDescription>
      </Field>

      <DialogFooter>
        <DialogClose
          render={<Button variant="outline" type="button" />}
          disabled={pending}
        >
          Cancelar
        </DialogClose>
        <Button type="submit" disabled={pending}>
          {pending && <Spinner data-icon="inline-start" />}
          Importar
        </Button>
      </DialogFooter>
    </form>
  );
}

export function ImportStudentsDialog() {
  const [open, setOpen] = useState(false);
  // Cambiar la key reinicia el formulario sin cerrar el diálogo.
  const [attempt, setAttempt] = useState(0);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="outline" />}>
        <FileUpIcon data-icon="inline-start" />
        Importar estudiantes (CSV)
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Importar estudiantes</DialogTitle>
          <DialogDescription>
            Matricula un salón completo desde un archivo CSV.
          </DialogDescription>
        </DialogHeader>
        <ImportStudentsForm
          key={attempt}
          onReset={() => setAttempt((n) => n + 1)}
        />
      </DialogContent>
    </Dialog>
  );
}
