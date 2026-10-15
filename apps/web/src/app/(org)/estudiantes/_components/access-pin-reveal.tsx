'use client';

import { CopyIcon, KeyRoundIcon } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { DialogClose, DialogFooter } from '@/components/ui/dialog';

// El PIN solo se puede ver aquí: la API guarda su hash.
export function AccessPinReveal({
  studentName,
  accessPin,
}: {
  studentName: string;
  accessPin: string;
}) {
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(accessPin);
      toast.success('PIN copiado');
    } catch {
      toast.error('No se pudo copiar el PIN');
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col items-center gap-3 rounded-lg border p-6 text-center">
        <KeyRoundIcon className="text-muted-foreground size-6" />
        <p className="text-muted-foreground text-sm">
          PIN de consulta de {studentName}
        </p>
        <p
          className="font-mono text-4xl font-semibold tracking-[0.3em] tabular-nums"
          aria-label={`PIN ${accessPin.split('').join(' ')}`}
        >
          {accessPin}
        </p>
        <Button type="button" variant="outline" size="sm" onClick={copy}>
          <CopyIcon data-icon="inline-start" />
          Copiar
        </Button>
      </div>
      <p className="text-muted-foreground text-sm">
        Entrégalo al estudiante o a su acudiente: lo usará junto con su número
        de documento para consultar sus notas. Anótalo ahora, no se podrá ver de
        nuevo; si se pierde, genera uno nuevo.
      </p>
      <DialogFooter>
        <DialogClose render={<Button type="button" />}>Listo</DialogClose>
      </DialogFooter>
    </div>
  );
}
