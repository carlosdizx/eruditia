import { cn } from '@/lib/utils';

const MEDALS: Record<number, { emoji: string; label: string }> = {
  1: { emoji: '🥇', label: 'Primer puesto' },
  2: { emoji: '🥈', label: 'Segundo puesto' },
  3: { emoji: '🥉', label: 'Tercer puesto' },
};

// Puesto en un ranking: medalla para los tres primeros.
export function PositionBadge({
  position,
  className,
}: {
  position: number;
  className?: string;
}) {
  const medal = MEDALS[position];
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 font-semibold tabular-nums',
        className,
      )}
      title={medal?.label}
    >
      {medal && (
        <span aria-hidden className="text-base leading-none">
          {medal.emoji}
        </span>
      )}
      {position}°
    </span>
  );
}
