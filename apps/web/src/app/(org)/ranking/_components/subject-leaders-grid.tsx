import { ScoreText } from '@/components/grading/score-text';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import type { SubjectLeaders } from '../types';

// Cuadrícula con el mejor estudiante de cada materia del salón.
export function SubjectLeadersGrid({ leaders }: { leaders: SubjectLeaders }) {
  const { subjects, scale } = leaders;

  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {subjects.map(({ subject, teacher, graded, leaders: top }) => (
        <Card key={subject.id} size="sm">
          <CardHeader>
            <CardTitle>{subject.name}</CardTitle>
            <CardDescription>
              {teacher
                ? `Prof. ${teacher.firstName} ${teacher.lastName}`
                : 'Sin docente'}{' '}
              · {graded} con nota
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!top.length ? (
              <p className="text-muted-foreground text-sm">Aún sin notas.</p>
            ) : (
              <ul className="flex flex-col gap-2">
                {top.map((row) => (
                  <li
                    key={row.enrollmentId}
                    className="flex items-center justify-between gap-3"
                  >
                    <span className="flex items-center gap-2">
                      <span aria-hidden className="text-lg leading-none">
                        🥇
                      </span>
                      <span className="font-medium">
                        {row.student.lastName} {row.student.firstName}
                      </span>
                    </span>
                    <ScoreText
                      score={row.score}
                      scale={scale}
                      className="text-lg"
                    />
                  </li>
                ))}
                {top.length > 1 && (
                  <li className="text-muted-foreground text-xs">
                    Empatados en el primer puesto.
                  </li>
                )}
              </ul>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
