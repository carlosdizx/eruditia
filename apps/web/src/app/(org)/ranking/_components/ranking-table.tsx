import { PositionBadge } from '@/components/grading/position-badge';
import { ScoreText } from '@/components/grading/score-text';
import { cn } from '@/lib/utils';
import type { Ranking } from '../types';

// Tabla del ranking: puesto, estudiante, nota y materias aprobadas/perdidas.
export function RankingTable({
  ranking,
  scoreLabel,
  showClassroom = false,
}: {
  ranking: Ranking;
  scoreLabel: string;
  showClassroom?: boolean;
}) {
  const { rows, scale } = ranking;

  return (
    <div className="overflow-x-auto rounded-xl border">
      <table className="w-full min-w-max border-collapse text-sm">
        <thead>
          <tr className="bg-muted/50 border-b">
            <th className="w-20 px-3 py-2 text-left font-medium">Puesto</th>
            <th className="px-3 py-2 text-left font-medium">Código</th>
            <th className="px-3 py-2 text-left font-medium">Estudiante</th>
            {showClassroom && (
              <th className="px-3 py-2 text-left font-medium">Salón</th>
            )}
            <th className="px-3 py-2 text-center font-medium">{scoreLabel}</th>
            <th className="px-3 py-2 text-center font-medium">Aprobadas</th>
            <th className="px-3 py-2 text-center font-medium">Perdidas</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={row.enrollmentId}
              className={cn(
                'border-b last:border-b-0',
                row.position <= 3 && 'bg-amber-50/50 dark:bg-amber-500/5',
              )}
            >
              <td className="px-3 py-2">
                <PositionBadge position={row.position} />
              </td>
              <td className="text-muted-foreground px-3 py-2 tabular-nums">
                {row.student.studentCode}
              </td>
              <td className="px-3 py-2 font-medium whitespace-nowrap">
                {row.student.lastName} {row.student.firstName}
              </td>
              {showClassroom && (
                <td className="px-3 py-2">{row.classroom.name}</td>
              )}
              <td className="px-3 py-2 text-center">
                <ScoreText score={row.score} scale={scale} />
              </td>
              <td className="px-3 py-2 text-center tabular-nums">
                {row.passedSubjects}
              </td>
              <td
                className={cn(
                  'px-3 py-2 text-center tabular-nums',
                  row.failedSubjects > 0 && 'text-destructive font-medium',
                )}
              >
                {row.failedSubjects}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
