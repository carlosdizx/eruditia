import type { Metadata } from 'next';
import { Suspense } from 'react';
import { LifeBuoyIcon } from 'lucide-react';
import { ScoreText } from '@/components/grading/score-text';
import { TableSkeleton } from '@/components/data/table-skeleton';
import { PanelContent, PanelHeader } from '@/components/panel/panel-header';
import { Badge } from '@/components/ui/badge';
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
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty';
import { getSelectedAcademicYear } from '@/lib/academic-year/selected-year';
import { authFetch } from '@/lib/api/auth-fetch';
import { requireGrant } from '@/lib/auth/current-user';
import { RECOVERY_GRANTS } from '@/lib/auth/permissions';
import { formatScore } from '@/lib/grading/scale';
import { RecoveryDialog } from './_components/recovery-dialog';
import type { RecoveryList } from './types';

export const metadata: Metadata = { title: 'Recuperaciones' };

async function Recoveries() {
  await requireGrant(RECOVERY_GRANTS.manage);

  // El admin sigue el año del selector; el profesor, el año activo.
  const { selected } = await getSelectedAcademicYear();
  const { academicYear, scale, periods, subjects } =
    await authFetch<RecoveryList>(
      `/recoveries${selected ? `?academicYearId=${selected.id}` : ''}`,
    );

  if (!academicYear || !subjects.length)
    return (
      <Empty className="border">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <LifeBuoyIcon />
          </EmptyMedia>
          <EmptyTitle>Sin materias por recuperar</EmptyTitle>
          <EmptyDescription>
            {academicYear
              ? `En ${academicYear.name} ningún estudiante tiene materias perdidas con todos los periodos calificados.`
              : 'Tu colegio todavía no tiene un año lectivo activo.'}
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    );

  const students = subjects.flatMap((subject) => subject.students);
  const recovered = students.filter(({ recovery }) => recovery).length;

  return (
    <>
      <p className="text-muted-foreground text-sm">
        Materias perdidas en {academicYear.name} con todos los periodos
        calificados. La nota de recuperación reemplaza el acumulado anual de la
        materia en el boletín y en la promoción. ·{' '}
        <span className="text-foreground font-medium">
          {students.length - recovered} pendientes
        </span>{' '}
        · {recovered} registradas
      </p>

      {subjects.map(({ id, subject, teacher, classroom, students: rows }) => (
        <Card key={id}>
          <CardHeader>
            <CardTitle className="flex flex-wrap items-center gap-2">
              {subject.name}
              <Badge variant="outline">{classroom.name}</Badge>
            </CardTitle>
            <CardDescription>
              {[
                classroom.gradeLevel?.name,
                teacher
                  ? `Prof. ${teacher.firstName} ${teacher.lastName}`
                  : 'Sin docente',
              ]
                .filter(Boolean)
                .join(' · ')}
            </CardDescription>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <table className="w-full min-w-max border-collapse text-sm">
              <thead>
                <tr className="border-b">
                  <th className="py-2 pr-3 text-left font-medium">
                    Estudiante
                  </th>
                  {periods.map((period) => (
                    <th
                      key={period.id}
                      className="px-2 py-2 text-center font-medium"
                    >
                      {period.name}
                    </th>
                  ))}
                  <th className="border-l px-3 py-2 text-center font-medium">
                    Acumulado
                  </th>
                  <th className="px-3 py-2 text-left font-medium">
                    Recuperación
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => {
                  const name = `${row.student.lastName} ${row.student.firstName}`;
                  return (
                    <tr
                      key={row.enrollmentId}
                      className="border-b last:border-b-0"
                    >
                      <td className="py-2 pr-3">
                        <div className="font-medium whitespace-nowrap">
                          {name}
                        </div>
                        <div className="text-muted-foreground text-xs">
                          Código {row.student.studentCode}
                        </div>
                      </td>
                      {periods.map((period) => (
                        <td key={period.id} className="px-2 py-2 text-center">
                          <ScoreText
                            score={row.periodScores[period.id] ?? null}
                            scale={scale}
                            className="font-normal"
                          />
                        </td>
                      ))}
                      <td className="border-l px-3 py-2 text-center">
                        <ScoreText score={row.originalScore} scale={scale} />
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex items-center gap-2">
                          {row.recovery && (
                            <span
                              className="flex flex-col"
                              title={row.recovery.notes ?? undefined}
                            >
                              <ScoreText
                                score={row.recovery.score}
                                scale={scale}
                              />
                              <span className="text-muted-foreground text-xs">
                                {row.recovery.score >= scale.passingScore
                                  ? 'Recuperada'
                                  : 'No recuperó'}
                              </span>
                            </span>
                          )}
                          {row.editable ? (
                            <RecoveryDialog
                              classroomSubjectId={id}
                              enrollmentId={row.enrollmentId}
                              studentName={name}
                              subjectName={subject.name}
                              originalScore={row.originalScore}
                              recovery={row.recovery}
                              scale={scale}
                            />
                          ) : (
                            !row.recovery && (
                              <span className="text-muted-foreground">—</span>
                            )
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <p className="text-muted-foreground mt-3 text-xs">
              Aprueba con {formatScore(scale.passingScore, scale)}.
            </p>
          </CardContent>
        </Card>
      ))}
    </>
  );
}

export default function RecoveriesPage() {
  return (
    <>
      <PanelHeader crumbs={[{ label: 'Recuperaciones' }]} yearSelector />
      <PanelContent>
        <Suspense fallback={<TableSkeleton rows={6} />}>
          <Recoveries />
        </Suspense>
      </PanelContent>
    </>
  );
}
