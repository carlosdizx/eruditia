import { Badge } from '@/components/ui/badge';
import { AnnualStatusBadge } from '@/components/grading/annual-status-badge';
import { ScoreText } from '@/components/grading/score-text';
import { formatScore } from '@/lib/grading/scale';
import { cn } from '@/lib/utils';
import { ENROLLMENT_STATUS_LABELS } from '../../../salones/[classroomId]/types';
import type { AnnualSummary } from '../../types';

export function AnnualSummaryTable({ summary }: { summary: AnnualSummary }) {
  const { periods, scale, students } = summary;
  const count = (status: string) =>
    students.filter(({ annual }) => annual.status === status).length;
  const [atRisk, failed] = [count('at_risk'), count('failed')];

  return (
    <div className="flex flex-col gap-3">
      <div className="text-muted-foreground flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
        <span>
          Aprueba con {formatScore(scale.passingScore, scale)} ·{' '}
          {periods
            .map(({ name, weightPercentage }) => `${name} ${weightPercentage}%`)
            .join(' · ')}
        </span>
        <span>{students.length} estudiantes</span>
        {atRisk > 0 && (
          <span className="text-amber-700 dark:text-amber-400">
            {atRisk} en riesgo
          </span>
        )}
        {failed > 0 && (
          <span className="text-destructive">
            {failed} {failed === 1 ? 'reprobada' : 'reprobadas'}
          </span>
        )}
      </div>

      <div className="overflow-x-auto rounded-xl border">
        <table className="w-full min-w-max border-collapse text-sm">
          <thead>
            <tr className="bg-muted/50 border-b">
              <th className="bg-muted sticky left-0 z-10 w-10 px-3 py-2 text-left font-medium">
                #
              </th>
              <th className="bg-muted sticky left-10 z-10 min-w-56 px-3 py-2 text-left font-medium">
                Estudiante
              </th>
              {periods.map((period) => (
                <th
                  key={period.id}
                  aria-label={`${period.name} (${period.weightPercentage}%)`}
                  className="min-w-20 px-2 py-2 text-center font-medium"
                >
                  <div className="flex flex-col items-center leading-tight">
                    <span>{period.name}</span>
                    <span className="text-muted-foreground text-xs font-normal">
                      {period.weightPercentage}%
                    </span>
                  </div>
                </th>
              ))}
              <th
                className="min-w-24 border-l px-3 py-2 text-center font-medium"
                title="Puntos ganados: suma de cada definitiva por el peso de su periodo"
              >
                Acumulado
              </th>
              <th
                className="min-w-24 px-3 py-2 text-center font-medium"
                title="Nota final si mantiene el promedio de los periodos calificados"
              >
                Proyección
              </th>
              <th
                className="min-w-24 px-3 py-2 text-center font-medium"
                title="Promedio que necesita en los periodos sin nota para aprobar"
              >
                Necesita
              </th>
              <th className="min-w-28 px-3 py-2 text-left font-medium">
                Estado
              </th>
            </tr>
          </thead>
          <tbody>
            {students.map(
              (
                { enrollmentId, status, student, periodScores, annual },
                index,
              ) => (
                <tr key={enrollmentId} className="border-b last:border-b-0">
                  <td className="bg-background text-muted-foreground sticky left-0 z-10 px-3 py-2 tabular-nums">
                    {index + 1}
                  </td>
                  <td className="bg-background sticky left-10 z-10 px-3 py-2">
                    <div className="flex items-center gap-2">
                      <span className="font-medium whitespace-nowrap">
                        {student.lastName} {student.firstName}
                      </span>
                      {status !== 'in_progress' && (
                        <Badge variant="outline" className="text-xs">
                          {ENROLLMENT_STATUS_LABELS[
                            status as keyof typeof ENROLLMENT_STATUS_LABELS
                          ] ?? status}
                        </Badge>
                      )}
                    </div>
                  </td>
                  {periods.map((period) => (
                    <td key={period.id} className="px-2 py-2 text-center">
                      <ScoreText
                        score={periodScores[period.id] ?? null}
                        scale={scale}
                        className="font-normal"
                      />
                    </td>
                  ))}
                  <td className="border-l px-3 py-2 text-center tabular-nums">
                    {annual.accumulated === null
                      ? '—'
                      : formatScore(annual.accumulated, scale)}
                  </td>
                  <td className="px-3 py-2 text-center">
                    <ScoreText score={annual.projected} scale={scale} />
                  </td>
                  <td
                    className={cn(
                      'px-3 py-2 text-center tabular-nums',
                      annual.requiredScore !== null &&
                        annual.requiredScore > scale.maxScore &&
                        'text-destructive',
                    )}
                  >
                    {annual.requiredScore === null
                      ? '—'
                      : annual.requiredScore > scale.maxScore
                        ? 'No alcanza'
                        : formatScore(annual.requiredScore, scale)}
                  </td>
                  <td className="px-3 py-2">
                    <AnnualStatusBadge annual={annual} />
                  </td>
                </tr>
              ),
            )}
          </tbody>
        </table>
      </div>

      <p className="text-muted-foreground text-xs">
        <strong>Acumulado</strong>: puntos ganados (definitiva × peso del
        periodo). <strong>Proyección</strong>: nota final si mantiene el
        promedio de los periodos calificados. <strong>Necesita</strong>:
        promedio mínimo en los periodos que faltan para aprobar con{' '}
        {formatScore(scale.passingScore, scale)}.
      </p>
    </div>
  );
}
