import { cn } from '@/lib/utils';
import { formatScore, type GradingScale } from '@/lib/grading/scale';

// Nota en verde si aprueba y en rojo si no; guion si no hay nota.
export function ScoreText({
  score,
  scale,
  className,
}: {
  score: number | null;
  scale: GradingScale;
  className?: string;
}) {
  if (score === null) return <span className="text-muted-foreground">—</span>;
  return (
    <span
      className={cn(
        'font-semibold tabular-nums',
        score < scale.passingScore
          ? 'text-destructive'
          : 'text-emerald-600 dark:text-emerald-400',
        className,
      )}
    >
      {formatScore(score, scale)}
    </span>
  );
}
