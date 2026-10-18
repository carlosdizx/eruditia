'use client';

import { useEffect, useMemo, useState, useTransition } from 'react';
import { CheckCircle2Icon, SaveIcon, UndoIcon } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { ScoreText } from '@/components/grading/score-text';
import { resolveConcept } from '@/lib/grading/concepts';
import { cn } from '@/lib/utils';
import {
  formatScore,
  parseScore,
  periodScore,
  type GradingScale,
} from '@/lib/grading/scale';
import { ENROLLMENT_STATUS_LABELS } from '../../../salones/[classroomId]/types';
import { saveGrades } from '../../actions';
import { ConceptsDialog } from './concepts-dialog';
import { EvaluationItemsDialog } from './evaluation-items-dialog';
import type {
  Gradebook,
  GradebookStudent,
  StudentGradesPayload,
} from '../../types';

// Lo que se ve en cada fila mientras se edita: texto tal cual se digita.
type Draft = { scores: Record<string, string>; observation: string };

const toDrafts = ({ items, students, scale }: Gradebook) =>
  Object.fromEntries(
    students.map(({ enrollmentId, grades, teacherObservation }) => [
      enrollmentId,
      {
        scores: Object.fromEntries(
          items.map(({ id }) => [
            id,
            grades[id] ? formatScore(grades[id].score, scale) : '',
          ]),
        ),
        observation: teacherObservation ?? '',
      },
    ]),
  ) as Record<string, Draft>;

const sameScore = (a: string, b: string, scale: GradingScale) => {
  const [left, right] = [parseScore(a, scale), parseScore(b, scale)];
  return left.ok && right.ok
    ? left.score === right.score
    : a.trim() === b.trim();
};

// Mueve el foco a la celda de la misma columna en otra fila.
const focusCell = (row: number, column: string) =>
  document
    .querySelector<HTMLInputElement>(
      `[data-row="${row}"][data-column="${column}"]`,
    )
    ?.focus();

export function GradebookSheet({
  gradebook: initial,
}: {
  gradebook: Gradebook;
}) {
  const [gradebook, setGradebook] = useState(initial);
  const [drafts, setDrafts] = useState(() => toDrafts(initial));
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const [pending, startTransition] = useTransition();

  const { items, students, scale, lock, period, classroomSubject } = gradebook;
  // Los conceptos se editan aparte y llegan con cada render del servidor.
  const { concepts } = initial;
  const base = useMemo(() => toDrafts(gradebook), [gradebook]);
  const canEdit = !lock;

  const rows = useMemo(
    () =>
      students.map((student) => {
        const draft = drafts[student.enrollmentId];
        const parsed = Object.fromEntries(
          items.map(({ id }) => [
            id,
            parseScore(draft.scores[id] ?? '', scale),
          ]),
        );
        const graded = items.flatMap(({ id, weightPercentage }) => {
          const value = parsed[id];
          return value.ok && value.score !== null
            ? [{ score: value.score, weightPercentage }]
            : [];
        });
        const original = base[student.enrollmentId];
        const changedItems = items.filter(
          ({ id }) =>
            !sameScore(
              draft.scores[id] ?? '',
              original.scores[id] ?? '',
              scale,
            ),
        );
        const observationChanged =
          draft.observation.trim() !== original.observation.trim();
        return {
          student,
          draft,
          parsed,
          final: periodScore(graded, scale.decimalPlaces),
          changedItems,
          observationChanged,
          dirty: changedItems.length > 0 || observationChanged,
          invalid: Object.values(parsed).some(({ ok }) => !ok),
        };
      }),
    [students, drafts, items, scale, base],
  );

  const dirtyRows = rows.filter(({ dirty }) => dirty);
  const invalidCount = rows.filter(({ invalid }) => invalid).length;
  const dirty = dirtyRows.length > 0;

  // Evita perder lo digitado al cerrar o recargar la pestaña.
  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);

  const finals = rows.flatMap(({ final }) => (final === null ? [] : [final]));
  const failing = finals.filter((score) => score < scale.passingScore).length;
  const average = finals.length
    ? finals.reduce((sum, score) => sum + score, 0) / finals.length
    : null;

  const setScore = (enrollmentId: string, itemId: string, value: string) =>
    setDrafts((current) => ({
      ...current,
      [enrollmentId]: {
        ...current[enrollmentId],
        scores: { ...current[enrollmentId].scores, [itemId]: value },
      },
    }));

  const setObservation = (enrollmentId: string, observation: string) =>
    setDrafts((current) => ({
      ...current,
      [enrollmentId]: { ...current[enrollmentId], observation },
    }));

  // Pegar una columna (o bloque) copiada de Excel desde la celda actual.
  const paste = (
    event: React.ClipboardEvent<HTMLInputElement>,
    rowIndex: number,
    itemIndex: number,
  ) => {
    const text = event.clipboardData.getData('text');
    if (!/[\t\n]/.test(text.trim())) return;
    event.preventDefault();

    const lines = text.replace(/\r/g, '').replace(/\n$/, '').split('\n');
    setDrafts((current) => {
      const next = { ...current };
      lines.forEach((line, lineIndex) => {
        const row = rows[rowIndex + lineIndex];
        if (!row?.student.editable) return;
        const { enrollmentId } = row.student;
        const scores = { ...next[enrollmentId].scores };
        line.split('\t').forEach((value, offset) => {
          const item = items[itemIndex + offset];
          if (item) scores[item.id] = value.trim();
        });
        next[enrollmentId] = { ...next[enrollmentId], scores };
      });
      return next;
    });
  };

  const navigate = (
    event: React.KeyboardEvent<HTMLInputElement>,
    rowIndex: number,
    column: string,
  ) => {
    if (event.key === 'Enter' || event.key === 'ArrowDown') {
      event.preventDefault();
      focusCell(rowIndex + 1, column);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      focusCell(rowIndex - 1, column);
    }
  };

  const save = () => {
    if (!period) return;
    const payload: StudentGradesPayload[] = dirtyRows.map(
      ({ student, draft, parsed, changedItems, observationChanged }) => ({
        enrollmentId: student.enrollmentId,
        grades: changedItems.map(({ id }) => {
          const value = parsed[id];
          return {
            evaluationItemId: id,
            score: value.ok ? value.score : null,
          };
        }),
        ...(observationChanged && {
          teacherObservation: draft.observation.trim() || null,
        }),
      }),
    );

    startTransition(async () => {
      const result = await saveGrades(classroomSubject.id, period.id, payload);
      if (!result.ok) {
        toast.error(result.message);
        return;
      }
      toast.success(result.message);
      setGradebook(result.gradebook);
      setDrafts(toDrafts(result.gradebook));
      setSavedAt(new Date());
    });
  };

  const discard = () => setDrafts(base);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="text-muted-foreground flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
          <span>
            Escala {formatScore(scale.minScore, scale)} a{' '}
            {formatScore(scale.maxScore, scale)} · aprueba con{' '}
            {formatScore(scale.passingScore, scale)}
          </span>
          <span>{students.length} estudiantes</span>
          {average !== null && (
            <span>
              Promedio del curso:{' '}
              <ScoreText score={Number(average.toFixed(2))} scale={scale} />
            </span>
          )}
          {failing > 0 && (
            <span className="text-destructive">{failing} reprobando</span>
          )}
        </div>
        {period && (
          <div className="flex flex-wrap gap-2">
            <ConceptsDialog
              classroomSubjectId={classroomSubject.id}
              periodId={period.id}
              periodName={period.name}
              concepts={concepts}
              scale={scale}
              editable={canEdit}
            />
            {canEdit && (
              <EvaluationItemsDialog
                classroomSubjectId={classroomSubject.id}
                periodId={period.id}
                items={items}
                // Cambiar columnas recarga la planilla: primero hay que guardar.
                disabled={dirty || pending}
              />
            )}
          </div>
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
              {items.map((item) => (
                <th
                  key={item.id}
                  aria-label={`${item.title} (${item.weightPercentage}%)`}
                  className="min-w-24 px-2 py-2 text-center font-medium"
                >
                  <div className="flex flex-col items-center leading-tight">
                    <span>{item.title}</span>
                    <span className="text-muted-foreground text-xs font-normal">
                      {item.weightPercentage}%
                    </span>
                  </div>
                </th>
              ))}
              <th className="min-w-24 border-l px-3 py-2 text-center font-medium">
                Definitiva
              </th>
              {concepts.length > 0 && (
                <th className="min-w-48 px-3 py-2 text-left font-medium">
                  Concepto
                </th>
              )}
              <th className="min-w-64 px-3 py-2 text-left font-medium">
                Observación
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map(
              (
                { student, draft, parsed, final, dirty: rowDirty },
                rowIndex,
              ) => {
                const editable = canEdit && student.editable;
                return (
                  <tr
                    key={student.enrollmentId}
                    className={cn(
                      'border-b last:border-b-0',
                      rowDirty && 'bg-amber-50/60 dark:bg-amber-500/5',
                    )}
                  >
                    <td className="bg-background text-muted-foreground sticky left-0 z-10 px-3 py-1.5 tabular-nums">
                      {rowIndex + 1}
                    </td>
                    <td className="bg-background sticky left-10 z-10 px-3 py-1.5">
                      <StudentName student={student} />
                    </td>
                    {items.map((item) => {
                      const value = parsed[item.id];
                      const failingScore =
                        value.ok &&
                        value.score !== null &&
                        value.score < scale.passingScore;
                      return (
                        <td key={item.id} className="px-2 py-1.5 text-center">
                          {editable ? (
                            <Input
                              data-row={rowIndex}
                              data-column={item.id}
                              inputMode="decimal"
                              autoComplete="off"
                              aria-label={`${item.title} de ${student.student.lastName} ${student.student.firstName}`}
                              aria-invalid={!value.ok}
                              title={value.ok ? undefined : value.message}
                              className={cn(
                                'mx-auto h-8 w-20 text-center tabular-nums',
                                failingScore && 'text-destructive font-medium',
                                !value.ok &&
                                  'border-destructive bg-destructive/10',
                              )}
                              value={draft.scores[item.id] ?? ''}
                              onChange={(event) =>
                                setScore(
                                  student.enrollmentId,
                                  item.id,
                                  event.target.value,
                                )
                              }
                              onKeyDown={(event) =>
                                navigate(event, rowIndex, item.id)
                              }
                              onPaste={(event) =>
                                paste(event, rowIndex, items.indexOf(item))
                              }
                              onFocus={(event) => event.target.select()}
                            />
                          ) : (
                            <span
                              className={cn(
                                'tabular-nums',
                                failingScore && 'text-destructive font-medium',
                              )}
                            >
                              {draft.scores[item.id] || '—'}
                            </span>
                          )}
                        </td>
                      );
                    })}
                    <td className="border-l px-3 py-1.5 text-center">
                      <ScoreText score={final} scale={scale} />
                    </td>
                    {concepts.length > 0 && (
                      <td className="px-3 py-1.5">
                        <ConceptPreview
                          text={
                            final === null
                              ? null
                              : (resolveConcept(concepts, final)?.conceptText ??
                                '')
                          }
                        />
                      </td>
                    )}
                    <td className="px-3 py-1.5">
                      {editable ? (
                        <Input
                          data-row={rowIndex}
                          data-column="observation"
                          aria-label={`Observación de ${student.student.lastName} ${student.student.firstName}`}
                          maxLength={2000}
                          placeholder="Sin observación"
                          className="h-8"
                          value={draft.observation}
                          onChange={(event) =>
                            setObservation(
                              student.enrollmentId,
                              event.target.value,
                            )
                          }
                          onKeyDown={(event) =>
                            navigate(event, rowIndex, 'observation')
                          }
                        />
                      ) : (
                        <span className="text-muted-foreground">
                          {draft.observation || '—'}
                        </span>
                      )}
                    </td>
                  </tr>
                );
              },
            )}
          </tbody>
        </table>
      </div>

      {canEdit && (
        <div className="bg-background/95 sticky bottom-0 flex flex-col gap-2 border-t py-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-muted-foreground text-sm">
            {invalidCount > 0 ? (
              <span className="text-destructive">
                Corrige las notas marcadas en rojo (rango{' '}
                {formatScore(scale.minScore, scale)} a{' '}
                {formatScore(scale.maxScore, scale)}).
              </span>
            ) : dirty ? (
              `${dirtyRows.length} ${dirtyRows.length === 1 ? 'fila con cambios' : 'filas con cambios'} sin guardar`
            ) : savedAt ? (
              <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
                <CheckCircle2Icon className="size-4" />
                Guardado a las{' '}
                {savedAt.toLocaleTimeString('es-CO', {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>
            ) : (
              'Enter o ↓ baja a la siguiente fila. Puedes pegar una columna desde Excel.'
            )}
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={discard}
              disabled={!dirty || pending}
            >
              <UndoIcon data-icon="inline-start" />
              Descartar
            </Button>
            <Button
              onClick={save}
              disabled={!dirty || invalidCount > 0 || pending}
            >
              {pending ? (
                <Spinner data-icon="inline-start" />
              ) : (
                <SaveIcon data-icon="inline-start" />
              )}
              Guardar cambios
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function StudentName({ student }: { student: GradebookStudent }) {
  return (
    <div className="flex items-center gap-2">
      <span className="font-medium whitespace-nowrap">
        {student.student.lastName} {student.student.firstName}
      </span>
      {!student.editable && (
        <Badge variant="outline" className="text-xs">
          {ENROLLMENT_STATUS_LABELS[
            student.status as keyof typeof ENROLLMENT_STATUS_LABELS
          ] ?? student.status}
        </Badge>
      )}
    </div>
  );
}

// null: sin definitiva; vacío: la nota cae en un rango sin concepto.
function ConceptPreview({ text }: { text: string | null }) {
  if (text === null) return <span className="text-muted-foreground">—</span>;
  if (!text)
    return (
      <span className="text-xs text-amber-700 dark:text-amber-400">
        Sin concepto para esta nota
      </span>
    );
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <span className="text-muted-foreground block max-w-56 cursor-default truncate text-xs" />
        }
      >
        {text}
      </TooltipTrigger>
      <TooltipContent className="max-w-sm">{text}</TooltipContent>
    </Tooltip>
  );
}
