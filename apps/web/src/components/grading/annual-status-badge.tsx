import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { annualStatusLabel, type AnnualScore } from '@/lib/grading/annual';

const STATUS_CLASSES = {
  passing:
    'border-emerald-600/20 bg-emerald-600/10 text-emerald-700 dark:text-emerald-400',
  at_risk:
    'border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400',
  failed: '',
};

export function AnnualStatusBadge({
  annual,
  recovered = false,
}: {
  annual: AnnualScore;
  recovered?: boolean;
}) {
  return (
    <Badge
      variant={
        annual.status === 'failed'
          ? 'destructive'
          : annual.status
            ? 'outline'
            : 'secondary'
      }
      className={cn(annual.status && STATUS_CLASSES[annual.status])}
    >
      {annualStatusLabel(annual, recovered)}
    </Badge>
  );
}
