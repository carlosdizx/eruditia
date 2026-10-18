'use client';

import { useTransition } from 'react';
import { WandSparklesIcon } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { loadStandardGradeLevels } from '../actions';

// Crea solo los grados que falten: no modifica los existentes.
export function LoadStandardButton() {
  const [pending, startTransition] = useTransition();

  const onClick = () =>
    startTransition(async () => {
      const result = await loadStandardGradeLevels();
      if (result.ok) toast.success(result.message);
      else toast.error(result.message);
    });

  return (
    <Button variant="outline" onClick={onClick} disabled={pending}>
      {pending ? (
        <Spinner data-icon="inline-start" />
      ) : (
        <WandSparklesIcon data-icon="inline-start" />
      )}
      Cargar plantilla estándar
    </Button>
  );
}
