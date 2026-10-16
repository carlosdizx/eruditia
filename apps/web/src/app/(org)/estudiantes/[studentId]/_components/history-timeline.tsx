import { HistoryIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty';
import {
  ENROLLMENT_STATUS_LABELS,
  type EnrollmentStatus,
} from '../../../salones/[classroomId]/types';
import type { HistoryEnrollment } from '../types';

const STATUS_VARIANTS: Record<
  EnrollmentStatus,
  'secondary' | 'outline' | 'destructive' | 'default'
> = {
  in_progress: 'secondary',
  promoted: 'default',
  graduated: 'default',
  failed: 'destructive',
  withdrawn: 'outline',
  transferred: 'outline',
};

// Punto de la línea: lleno mientras cursa, con borde cuando ya cerró.
const DOT_CLASSES: Record<EnrollmentStatus, string> = {
  in_progress: 'bg-primary border-primary',
  promoted: 'bg-background border-primary',
  graduated: 'bg-background border-primary',
  failed: 'bg-background border-destructive',
  withdrawn: 'bg-background border-muted-foreground',
  transferred: 'bg-background border-muted-foreground',
};

const formatDate = (value: string) =>
  new Date(`${value}T00:00:00`).toLocaleDateString('es-CO', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

// Del año más reciente al más antiguo.
export function HistoryTimeline({
  enrollments,
}: {
  enrollments: HistoryEnrollment[];
}) {
  if (!enrollments.length)
    return (
      <Empty className="border">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <HistoryIcon />
          </EmptyMedia>
          <EmptyTitle>Sin historial</EmptyTitle>
          <EmptyDescription>
            El estudiante aún no ha sido matriculado en ningún salón.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    );

  return (
    <ol className="relative flex flex-col gap-4 border-l pl-6">
      {[...enrollments].reverse().map((enrollment) => (
        <li key={enrollment.id} className="relative">
          <span
            aria-hidden
            className={cn(
              'absolute top-4 -left-[31px] size-3 rounded-full border-2',
              DOT_CLASSES[enrollment.status],
            )}
          />
          <div className="bg-card flex flex-col gap-3 rounded-xl border p-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex min-w-0 flex-col gap-1">
              <span className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
                {enrollment.academicYear?.name ?? 'Año eliminado'}
              </span>
              <span className="text-base font-semibold">
                {enrollment.classroom?.gradeLevel?.name ?? 'Sin grado'} ·{' '}
                {enrollment.classroom?.name ?? 'Salón eliminado'}
              </span>
              <span className="text-muted-foreground text-sm">
                Matriculado el {formatDate(enrollment.enrollmentDate)}
              </span>
              {enrollment.promotionNotes && (
                <p className="text-muted-foreground text-sm italic">
                  {enrollment.promotionNotes}
                </p>
              )}
            </div>
            <div className="flex shrink-0 items-center gap-3 sm:flex-col sm:items-end">
              <Badge variant={STATUS_VARIANTS[enrollment.status]}>
                {ENROLLMENT_STATUS_LABELS[enrollment.status]}
              </Badge>
              <span className="text-sm">
                <span className="text-muted-foreground">Promedio </span>
                <span className="font-medium tabular-nums">
                  {enrollment.finalAverage?.toFixed(2) ?? '—'}
                </span>
                {enrollment.computedAverage !== null &&
                  enrollment.computedAverage !== enrollment.finalAverage && (
                    <span className="text-muted-foreground block text-xs">
                      Ajustado (calculado{' '}
                      {enrollment.computedAverage.toFixed(2)})
                    </span>
                  )}
              </span>
            </div>
          </div>
        </li>
      ))}
    </ol>
  );
}
