'use client';

import { useState, useTransition } from 'react';
import { CopyIcon } from 'lucide-react';
import { toast } from 'sonner';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Spinner } from '@/components/ui/spinner';
import { copyStructure } from '../actions';

type YearOption = { id: string; name: string };

export function CopyStructureDialog({
  target,
  sources,
}: {
  target: YearOption;
  // Los demás años, del más reciente al más antiguo.
  sources: YearOption[];
}) {
  const [open, setOpen] = useState(false);
  const [sourceId, setSourceId] = useState(sources[0]?.id ?? '');
  const [pending, startTransition] = useTransition();

  const items = sources.map(({ id, name }) => ({ value: id, label: name }));
  const source = sources.find(({ id }) => id === sourceId);

  const onCopy = () =>
    startTransition(async () => {
      const result = await copyStructure(sourceId, target.id);

      if (!result.ok) {
        toast.error(result.message);
        return;
      }

      setOpen(false);
      toast.success(result.message);
    });

  return (
    <Dialog open={open} onOpenChange={(next) => !pending && setOpen(next)}>
      <DialogTrigger render={<Button variant="outline" />}>
        <CopyIcon data-icon="inline-start" />
        Copiar del año anterior
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Copiar salones y materias</DialogTitle>
          <DialogDescription>
            Crea en {target.name} los salones de otro año con su director de
            grupo y su carga académica.
          </DialogDescription>
        </DialogHeader>

        <Field>
          <FieldLabel htmlFor="sourceYear">Copiar desde</FieldLabel>
          <Select
            items={items}
            value={sourceId}
            onValueChange={(value) => setSourceId(String(value))}
          >
            <SelectTrigger id="sourceYear" className="w-full">
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
          <FieldDescription>
            Los salones que ya existan en {target.name} se omiten, y los
            profesores que ya no estén activos quedan sin asignar. No se copian
            estudiantes ni notas.
          </FieldDescription>
        </Field>

        <DialogFooter>
          <DialogClose
            render={<Button variant="outline" type="button" />}
            disabled={pending}
          >
            Cancelar
          </DialogClose>
          <Button onClick={onCopy} disabled={pending || !source}>
            {pending && <Spinner data-icon="inline-start" />}
            Copiar desde {source?.name}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
