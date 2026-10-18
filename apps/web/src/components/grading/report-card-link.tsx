import Link from 'next/link';
import { FileTextIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';

// Abre la vista previa del boletín de una matrícula; from: a dónde vuelve.
export function ReportCardLink({
  enrollmentId,
  from,
}: {
  enrollmentId: string;
  from: string;
}) {
  return (
    <Button
      variant="outline"
      size="sm"
      nativeButton={false}
      render={
        <Link
          href={`/boletines/${enrollmentId}?desde=${encodeURIComponent(from)}`}
        />
      }
    >
      <FileTextIcon data-icon="inline-start" />
      Boletín
    </Button>
  );
}
