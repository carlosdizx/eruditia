import type { ReactNode } from 'react';
import { ChevronDownIcon, MessageSquareTextIcon } from 'lucide-react';
import { AnnualStatusBadge } from '@/components/grading/annual-status-badge';
import { ScoreText } from '@/components/grading/score-text';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from '@/components/ui/empty';
import { formatScore } from '@/lib/grading/scale';
import type {
  ReportCardResponse,
  ReportCardSubject,
} from '@/lib/grading/report-card';

type Card = NonNullable<ReportCardResponse['reportCard']>;

// Boletín del estudiante: lo usan el panel (con login) y el portal con PIN.
// yearSelector: cómo se cambia de año en cada caso.
export function ReportCard({
  data,
  yearSelector,
}: {
  data: ReportCardResponse;
  yearSelector?: ReactNode;
}) {
  const { organization, student, reportCard } = data;

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader>
          <CardDescription>
            {organization.name} · Boletín de calificaciones
          </CardDescription>
          <CardTitle className="text-xl">
            {student.lastName} {student.firstName}
          </CardTitle>
          <p className="text-muted-foreground text-sm">
            {[
              `${student.documentType} ${student.documentNumber}`,
              `Código ${student.studentCode}`,
              reportCard &&
                [
                  reportCard.classroom.gradeLevel?.name,
                  reportCard.classroom.name,
                ]
                  .filter(Boolean)
                  .join(' '),
              reportCard && `Año lectivo ${reportCard.academicYear.name}`,
            ]
              .filter(Boolean)
              .join(' · ')}
          </p>
        </CardHeader>
        {yearSelector && <CardContent>{yearSelector}</CardContent>}
      </Card>

      {!reportCard ? (
        <Empty className="border">
          <EmptyHeader>
            <EmptyTitle>Sin matrícula</EmptyTitle>
            <EmptyDescription>
              Todavía no estás matriculado en ningún año lectivo.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <ReportCardBody card={reportCard} />
      )}
    </div>
  );
}

function ReportCardBody({ card }: { card: Card }) {
  const { scale, periods, subjects, averages } = card;
  const atRisk = subjects.filter(
    ({ annual }) => annual.status === 'at_risk' || annual.status === 'failed',
  ).length;

  return (
    <>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Promedio general">
          <ScoreText
            score={averages.general}
            scale={scale}
            className="text-2xl"
          />
        </Stat>
        {periods.map((period) => (
          <Stat key={period.id} label={`Promedio ${period.name}`}>
            <ScoreText
              score={averages.periods[period.id] ?? null}
              scale={scale}
              className="text-xl"
            />
          </Stat>
        ))}
        <Stat label="Materias en riesgo">
          <span
            className={
              atRisk
                ? 'text-destructive text-xl font-semibold'
                : 'text-xl font-semibold'
            }
          >
            {atRisk} de {subjects.length}
          </span>
        </Stat>
      </div>

      {!subjects.length ? (
        <Empty className="border">
          <EmptyHeader>
            <EmptyTitle>Sin materias</EmptyTitle>
            <EmptyDescription>
              Tu salón aún no tiene materias asignadas.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <>
          <div className="overflow-x-auto rounded-xl border">
            <table className="w-full min-w-max border-collapse text-sm">
              <thead>
                <tr className="bg-muted/50 border-b">
                  <th className="min-w-48 px-3 py-2 text-left font-medium">
                    Materia
                  </th>
                  {periods.map((period) => (
                    <th
                      key={period.id}
                      aria-label={`${period.name} (${period.weightPercentage}%)`}
                      className="min-w-16 px-2 py-2 text-center font-medium"
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
                    className="min-w-20 border-l px-3 py-2 text-center font-medium"
                    title="Nota final si mantienes el promedio de los periodos calificados"
                  >
                    Acumulado
                  </th>
                  <th className="min-w-28 px-3 py-2 text-left font-medium">
                    Estado
                  </th>
                </tr>
              </thead>
              <tbody>
                {subjects.map((subject) => (
                  <tr key={subject.id} className="border-b last:border-b-0">
                    <td className="px-3 py-2">
                      <div className="font-medium">{subject.subject.name}</div>
                      {subject.teacher && (
                        <div className="text-muted-foreground text-xs">
                          Prof. {subject.teacher.firstName}{' '}
                          {subject.teacher.lastName}
                        </div>
                      )}
                    </td>
                    {periods.map((period) => (
                      <td key={period.id} className="px-2 py-2 text-center">
                        <ScoreText
                          score={subject.periods[period.id]?.score ?? null}
                          scale={scale}
                          className="font-normal"
                        />
                      </td>
                    ))}
                    <td className="border-l px-3 py-2 text-center">
                      <ScoreText
                        score={subject.annual.projected}
                        scale={scale}
                      />
                    </td>
                    <td className="px-3 py-2">
                      <AnnualStatusBadge annual={subject.annual} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-muted-foreground text-xs">
            Escala {formatScore(scale.minScore, scale)} a{' '}
            {formatScore(scale.maxScore, scale)} · se aprueba con{' '}
            {formatScore(scale.passingScore, scale)}. El acumulado es tu nota
            final si mantienes el promedio de los periodos ya calificados.
          </p>

          <section className="flex flex-col gap-2">
            <h2 className="text-base font-semibold">Detalle por materia</h2>
            {subjects.map((subject) => (
              <SubjectDetail
                key={subject.id}
                subject={subject}
                periods={periods}
                scale={scale}
              />
            ))}
          </section>
        </>
      )}
    </>
  );
}

function Stat({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="bg-card flex flex-col gap-1 rounded-xl border px-4 py-3">
      <span className="text-muted-foreground text-xs">{label}</span>
      {children}
    </div>
  );
}

function SubjectDetail({
  subject,
  periods,
  scale,
}: {
  subject: ReportCardSubject;
  periods: Card['periods'];
  scale: Card['scale'];
}) {
  const { annual } = subject;
  const graded = periods.filter(({ id }) => {
    const result = subject.periods[id];
    return (
      !!result &&
      (result.score !== null ||
        !!result.observation ||
        result.activities.some(({ score }) => score !== null))
    );
  });

  return (
    <details className="group bg-card rounded-xl border">
      <summary className="flex cursor-pointer list-none items-center gap-3 px-4 py-3 [&::-webkit-details-marker]:hidden">
        <ChevronDownIcon className="text-muted-foreground size-4 shrink-0 transition-transform group-open:rotate-180" />
        <span className="flex-1 font-medium">{subject.subject.name}</span>
        <ScoreText score={annual.projected} scale={scale} />
        <AnnualStatusBadge annual={annual} />
      </summary>
      <div className="flex flex-col gap-4 border-t px-4 py-3">
        {annual.requiredScore !== null && (
          <p className="text-muted-foreground text-sm">
            {annual.requiredScore > scale.maxScore
              ? 'Con los periodos que faltan ya no alcanza la nota aprobatoria.'
              : `Para aprobar necesitas un promedio de ${formatScore(annual.requiredScore, scale)} en los periodos que faltan.`}
          </p>
        )}
        {!graded.length ? (
          <p className="text-muted-foreground text-sm">
            Aún no hay notas en esta materia.
          </p>
        ) : (
          graded.map((period) => {
            const result = subject.periods[period.id];
            return (
              <div key={period.id} className="flex flex-col gap-2">
                <div className="flex items-center justify-between gap-2 text-sm">
                  <span className="font-medium">
                    {period.name}{' '}
                    <span className="text-muted-foreground font-normal">
                      ({period.weightPercentage}%)
                    </span>
                  </span>
                  <span>
                    Definitiva <ScoreText score={result.score} scale={scale} />
                  </span>
                </div>
                {result.activities.length > 1 && (
                  <ul className="flex flex-col gap-1 text-sm">
                    {result.activities.map((activity, index) => (
                      <li
                        key={index}
                        className="flex items-center justify-between gap-2 border-b border-dashed pb-1 last:border-b-0"
                      >
                        <span>
                          {activity.title}{' '}
                          <span className="text-muted-foreground">
                            ({activity.weightPercentage}%)
                          </span>
                        </span>
                        <ScoreText
                          score={activity.score}
                          scale={scale}
                          className="font-normal"
                        />
                      </li>
                    ))}
                  </ul>
                )}
                {result.observation && (
                  <p className="bg-muted flex items-start gap-2 rounded-lg px-3 py-2 text-sm">
                    <MessageSquareTextIcon className="text-muted-foreground mt-0.5 size-4 shrink-0" />
                    {result.observation}
                  </p>
                )}
              </div>
            );
          })
        )}
      </div>
    </details>
  );
}
