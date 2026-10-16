'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { CircleAlertIcon, CircleCheckIcon, UsersIcon } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
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
import { Field, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Spinner } from '@/components/ui/spinner';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { promoteStudents } from '../actions';
import type {
  PromotionClassroom,
  PromotionOutcome,
  PromotionPreview,
  PromotionResult,
} from '../types';

const SKIP = 'skip';
type Choice = PromotionOutcome | typeof SKIP;

type Row = {
  choice: Choice;
  targetClassroomId: string | null;
  finalAverage: string;
  notes: string;
};

// Fecha local (AAAA-MM-DD), no la UTC.
const today = () => new Date().toLocaleDateString('en-CA');

const parseAverage = (value: string) => {
  if (!value.trim()) return undefined;
  const number = Number(value.replace(',', '.'));
  return Number.isFinite(number) && number >= 0 && number <= 999.99
    ? Math.round(number * 100) / 100
    : null;
};

// Paso 2: decisión por estudiante, salón destino y confirmación.
export function PromotionReview({ preview }: { preview: PromotionPreview }) {
  const router = useRouter();
  const {
    sourceClassroom,
    targetAcademicYear,
    passingGrade,
    sameClassrooms,
    nextClassrooms,
    nextGradeLevel,
    students,
  } = preview;
  const grade = sourceClassroom.gradeLevel;
  const isFinal = grade.isFinalGrade;

  const targetFor = (choice: Choice) =>
    choice === 'promote'
      ? preview.suggestedNextClassroomId
      : choice === 'repeat'
        ? preview.suggestedSameClassroomId
        : null;

  // Sugerencia según el promedio y la nota mínima de la organización.
  const suggest = (average: number | null | undefined): Choice => {
    if (average === null || average === undefined) return SKIP;
    if (average < passingGrade) return 'repeat';
    return isFinal ? 'graduate' : 'promote';
  };

  const [rows, setRows] = useState<Record<string, Row>>(() =>
    Object.fromEntries(
      students.map(
        ({
          enrollmentId,
          suggestedOutcome,
          finalAverage,
          promotionNotes,
          targetEnrollment,
        }) => {
          const choice: Choice = targetEnrollment
            ? SKIP
            : (suggestedOutcome ?? SKIP);
          return [
            enrollmentId,
            {
              choice,
              targetClassroomId: targetFor(choice),
              finalAverage: finalAverage?.toString() ?? '',
              notes: promotionNotes ?? '',
            },
          ];
        },
      ),
    ),
  );
  const [enrollmentDate, setEnrollmentDate] = useState(today);
  const [confirming, setConfirming] = useState(false);
  const [result, setResult] = useState<Extract<
    PromotionResult,
    { ok: true }
  > | null>(null);
  const [pending, startTransition] = useTransition();

  const update = (enrollmentId: string, patch: Partial<Row>) =>
    setRows((current) => ({
      ...current,
      [enrollmentId]: { ...current[enrollmentId], ...patch },
    }));

  const setChoice = (enrollmentId: string, choice: Choice) =>
    update(enrollmentId, { choice, targetClassroomId: targetFor(choice) });

  // Al escribir el promedio se recalcula la sugerencia.
  const setAverage = (enrollmentId: string, finalAverage: string) => {
    const average = parseAverage(finalAverage);
    const choice = average === null ? undefined : suggest(average);
    update(enrollmentId, {
      finalAverage,
      ...(choice && { choice, targetClassroomId: targetFor(choice) }),
    });
  };

  const included = students.filter(
    ({ enrollmentId, targetEnrollment }) =>
      !targetEnrollment && rows[enrollmentId].choice !== SKIP,
  );
  const count = (choice: Choice) =>
    included.filter(({ enrollmentId }) => rows[enrollmentId].choice === choice)
      .length;

  // Ocupación de cada salón destino con lo que se va a matricular.
  const incoming = new Map<string, number>();
  for (const { enrollmentId } of included) {
    const { choice, targetClassroomId } = rows[enrollmentId];
    if (choice !== 'graduate' && targetClassroomId)
      incoming.set(
        targetClassroomId,
        (incoming.get(targetClassroomId) ?? 0) + 1,
      );
  }
  const occupancy = [...nextClassrooms, ...sameClassrooms].map((classroom) => ({
    ...classroom,
    incoming: incoming.get(classroom.id) ?? 0,
  }));

  const problems = [
    ...included
      .filter(({ enrollmentId }) => {
        const { choice, targetClassroomId } = rows[enrollmentId];
        return choice !== 'graduate' && !targetClassroomId;
      })
      .map(
        ({ student }) =>
          `Falta el salón destino de ${student.firstName} ${student.lastName}`,
      ),
    ...included
      .filter(
        ({ enrollmentId }) =>
          parseAverage(rows[enrollmentId].finalAverage) === null,
      )
      .map(
        ({ student }) =>
          `El promedio de ${student.firstName} ${student.lastName} no es válido`,
      ),
    ...occupancy
      .filter(
        ({ capacity, enrolled, incoming }) =>
          capacity && enrolled + incoming > capacity,
      )
      .map(({ name, capacity }) => `${name} supera su cupo (${capacity})`),
  ];

  const onConfirm = () =>
    startTransition(async () => {
      const outcome = await promoteStudents({
        sourceClassroomId: sourceClassroom.id,
        targetAcademicYearId: targetAcademicYear.id,
        enrollmentDate,
        decisions: included.map(({ enrollmentId }) => {
          const { choice, targetClassroomId, finalAverage, notes } =
            rows[enrollmentId];
          const average = parseAverage(finalAverage);
          return {
            enrollmentId,
            outcome: choice as PromotionOutcome,
            ...(choice !== 'graduate' && {
              targetClassroomId: targetClassroomId!,
            }),
            ...(average !== undefined &&
              average !== null && { finalAverage: average }),
            ...(notes.trim() && { promotionNotes: notes.trim() }),
          };
        }),
      });

      if (!outcome.ok) {
        toast.error(outcome.message);
        return;
      }
      setConfirming(false);
      setResult(outcome);
      toast.success('Se ejecutó la promoción');
    });

  if (result)
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CircleCheckIcon className="text-primary size-5" />
            Promoción de {sourceClassroom.name} ejecutada
          </CardTitle>
          <CardDescription>
            Las matrículas de {sourceClassroom.academicYear.name} quedaron
            cerradas y las nuevas ya cursan en {targetAcademicYear.name}.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm">
            <span>
              <span className="font-medium tabular-nums">
                {result.promoted}
              </span>{' '}
              promovidos
            </span>
            <span>
              <span className="font-medium tabular-nums">
                {result.repeated}
              </span>{' '}
              repiten
            </span>
            <span>
              <span className="font-medium tabular-nums">
                {result.graduated}
              </span>{' '}
              graduados
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            {occupancy
              .filter(({ incoming }) => incoming)
              .map(({ id, name }) => (
                <Button
                  key={id}
                  variant="outline"
                  size="sm"
                  nativeButton={false}
                  render={<Link href={`/salones/${id}`} />}
                >
                  Ver {name} · {targetAcademicYear.name}
                </Button>
              ))}
            <Button size="sm" onClick={() => router.refresh()}>
              Revisar los que faltan
            </Button>
          </div>
        </CardContent>
      </Card>
    );

  if (!students.length)
    return (
      <Empty className="border">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <UsersIcon />
          </EmptyMedia>
          <EmptyTitle>Nada por promover</EmptyTitle>
          <EmptyDescription>
            {sourceClassroom.name} no tiene estudiantes cursando en{' '}
            {sourceClassroom.academicYear.name}.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    );

  const outcomeItems = [
    ...(isFinal
      ? [{ value: 'graduate', label: 'Graduar' }]
      : [
          {
            value: 'promote',
            label: `Promover a ${nextGradeLevel?.name ?? 'siguiente grado'}`,
          },
        ]),
    { value: 'repeat', label: `Repetir ${grade.name}` },
    { value: SKIP, label: 'No incluir' },
  ];

  const classroomItems = (choice: Choice) =>
    (choice === 'promote'
      ? nextClassrooms
      : choice === 'repeat'
        ? sameClassrooms
        : []
    ).map(({ id, name }: PromotionClassroom) => ({ value: id, label: name }));

  return (
    <>
      {!isFinal && !nextClassrooms.length && (
        <Notice>
          No hay salones de {nextGradeLevel?.name ?? 'el grado siguiente'} en{' '}
          {targetAcademicYear.name}. Créalos en Salones para poder promover.
        </Notice>
      )}
      {!sameClassrooms.length && (
        <Notice>
          No hay salones de {grade.name} en {targetAcademicYear.name} para los
          que repiten.
        </Notice>
      )}

      <p className="text-muted-foreground text-sm">
        Nota mínima de aprobación:{' '}
        <span className="text-foreground font-medium tabular-nums">
          {passingGrade.toFixed(2)}
        </span>
        . La decisión se sugiere con el promedio final; puedes cambiarla en cada
        estudiante.
      </p>

      <div className="rounded-xl border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="pl-4">Estudiante</TableHead>
              <TableHead className="w-28">Promedio</TableHead>
              <TableHead className="w-52">Decisión</TableHead>
              <TableHead className="w-40">Salón destino</TableHead>
              <TableHead className="pr-4">Observación</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {students.map(({ enrollmentId, student, targetEnrollment }) => {
              const row = rows[enrollmentId];
              const name = `${student.lastName} ${student.firstName}`;
              const invalidAverage = parseAverage(row.finalAverage) === null;
              const items = classroomItems(row.choice);

              if (targetEnrollment)
                return (
                  <TableRow key={enrollmentId} className="opacity-70">
                    <TableCell className="pl-4 font-medium">{name}</TableCell>
                    <TableCell
                      colSpan={4}
                      className="text-muted-foreground pr-4"
                    >
                      Ya está matriculado en {targetEnrollment.classroomName} ·{' '}
                      {targetAcademicYear.name}. Anula esa matrícula para
                      incluirlo.
                    </TableCell>
                  </TableRow>
                );

              return (
                <TableRow
                  key={enrollmentId}
                  className={cn(row.choice === SKIP && 'text-muted-foreground')}
                >
                  <TableCell className="pl-4">
                    <div className="flex flex-col">
                      <span className="font-medium">{name}</span>
                      <span className="text-muted-foreground text-xs">
                        Código {student.studentCode}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Input
                      inputMode="decimal"
                      aria-label={`Promedio de ${name}`}
                      aria-invalid={invalidAverage || undefined}
                      value={row.finalAverage}
                      onChange={(event) =>
                        setAverage(enrollmentId, event.target.value)
                      }
                      placeholder="—"
                      className="tabular-nums"
                    />
                  </TableCell>
                  <TableCell>
                    <Select
                      items={outcomeItems}
                      value={row.choice}
                      onValueChange={(value) =>
                        setChoice(enrollmentId, String(value) as Choice)
                      }
                    >
                      <SelectTrigger
                        className="w-full"
                        aria-label={`Decisión para ${name}`}
                      >
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {outcomeItems.map((item) => (
                          <SelectItem key={item.value} value={item.value}>
                            {item.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    {row.choice === 'graduate' ? (
                      <Badge>Graduado</Badge>
                    ) : row.choice === SKIP ? (
                      <span>—</span>
                    ) : (
                      <Select
                        items={items}
                        value={row.targetClassroomId}
                        onValueChange={(value) =>
                          update(enrollmentId, {
                            targetClassroomId: String(value),
                          })
                        }
                        disabled={!items.length}
                      >
                        <SelectTrigger
                          className="w-full"
                          aria-label={`Salón destino de ${name}`}
                        >
                          <SelectValue placeholder="Elegir" />
                        </SelectTrigger>
                        <SelectContent>
                          {items.map((item) => (
                            <SelectItem key={item.value} value={item.value}>
                              {item.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  </TableCell>
                  <TableCell className="pr-4">
                    <Input
                      aria-label={`Observación para ${name}`}
                      value={row.notes}
                      onChange={(event) =>
                        update(enrollmentId, { notes: event.target.value })
                      }
                      maxLength={1000}
                      placeholder="Opcional"
                      disabled={row.choice === SKIP}
                    />
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {occupancy.some(({ incoming }) => incoming) && (
        <div className="flex flex-wrap gap-2">
          {occupancy
            .filter(({ incoming }) => incoming)
            .map(({ id, name, capacity, enrolled, incoming }) => (
              <Badge
                key={id}
                variant={
                  capacity && enrolled + incoming > capacity
                    ? 'destructive'
                    : 'outline'
                }
              >
                {name}: {enrolled + incoming}
                {capacity ? ` / ${capacity}` : ''} estudiantes
              </Badge>
            ))}
        </div>
      )}

      <Card>
        <CardContent className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className="flex flex-col gap-1 text-sm">
            <span>
              {isFinal
                ? `${count('graduate')} se gradúan`
                : `${count('promote')} promueven`}{' '}
              · {count('repeat')} repiten · {students.length - included.length}{' '}
              sin incluir
            </span>
            {problems.length > 0 && (
              <span className="text-destructive">{problems[0]}</span>
            )}
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
            <Field className="sm:w-44">
              <FieldLabel htmlFor="promotionDate">
                Fecha de las matrículas
              </FieldLabel>
              <Input
                id="promotionDate"
                type="date"
                value={enrollmentDate}
                onChange={(event) => setEnrollmentDate(event.target.value)}
              />
            </Field>
            <Button
              onClick={() => setConfirming(true)}
              disabled={
                !included.length || problems.length > 0 || !enrollmentDate
              }
            >
              Ejecutar promoción
            </Button>
          </div>
        </CardContent>
      </Card>

      <AlertDialog
        open={confirming}
        onOpenChange={(open) => !pending && setConfirming(open)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              ¿Ejecutar la promoción de {sourceClassroom.name}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Se cerrarán {included.length} matrículas de{' '}
              {sourceClassroom.academicYear.name} con su estado definitivo
              {included.length - count('graduate') > 0 &&
                ` y se crearán ${included.length - count('graduate')} en ${targetAcademicYear.name}`}
              {count('graduate') > 0 &&
                `; ${count('graduate')} estudiantes quedarán como graduados`}
              . Los que no incluiste siguen cursando.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={pending}>Cancelar</AlertDialogCancel>
            <Button onClick={onConfirm} disabled={pending}>
              {pending && <Spinner data-icon="inline-start" />}
              Ejecutar
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function Notice({ children }: { children: React.ReactNode }) {
  return (
    <div
      role="alert"
      className="flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-700 dark:text-amber-400"
    >
      <CircleAlertIcon className="mt-0.5 size-4 shrink-0" />
      <span>{children}</span>
    </div>
  );
}
