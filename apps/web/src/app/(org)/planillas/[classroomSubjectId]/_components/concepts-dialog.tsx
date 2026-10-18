'use client';

import { useEffect, useState, useTransition } from 'react';
import {
  CopyIcon,
  MessageSquareQuoteIcon,
  PlusIcon,
  Trash2Icon,
  TriangleAlertIcon,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Spinner } from '@/components/ui/spinner';
import { Textarea } from '@/components/ui/textarea';
import {
  findGaps,
  findOverlap,
  type SubjectConcept,
} from '@/lib/grading/concepts';
import {
  formatScore,
  parseScore,
  type GradingScale,
} from '@/lib/grading/scale';
import { getConceptSources, setSubjectConcepts } from '../../actions';
import type { ConceptSource } from '../../types';

type Row = { key: string; min: string; max: string; text: string };

const MAX_CONCEPTS = 20;
const MAX_TEXT = 2000;

const toRows = (concepts: SubjectConcept[], scale: GradingScale): Row[] =>
  [...concepts]
    .sort((a, b) => a.minScore - b.minScore)
    .map(({ minScore, maxScore, conceptText }) => ({
      key: crypto.randomUUID(),
      min: formatScore(minScore, scale),
      max: formatScore(maxScore, scale),
      text: conceptText,
    }));

// Cada fila validada: el error se muestra junto a la fila.
const parseRow = (row: Row, scale: GradingScale) => {
  const min = parseScore(row.min, scale);
  const max = parseScore(row.max, scale);
  if (!min.ok || min.score === null)
    return { error: min.ok ? 'Falta la nota mínima' : min.message };
  if (!max.ok || max.score === null)
    return { error: max.ok ? 'Falta la nota máxima' : max.message };
  if (min.score > max.score)
    return { error: 'La nota mínima no puede superar la máxima' };
  if (!row.text.trim()) return { error: 'Escribe el concepto' };
  return {
    concept: {
      minScore: min.score,
      maxScore: max.score,
      conceptText: row.text.trim(),
    },
  };
};

const rangeLabel = (
  { minScore, maxScore }: Pick<SubjectConcept, 'minScore' | 'maxScore'>,
  scale: GradingScale,
) => `${formatScore(minScore, scale)} a ${formatScore(maxScore, scale)}`;

function CopyFromSource({
  classroomSubjectId,
  periodId,
  onCopy,
}: {
  classroomSubjectId: string;
  periodId: string;
  onCopy: (concepts: SubjectConcept[]) => void;
}) {
  const [sources, setSources] = useState<ConceptSource[] | null>(null);

  useEffect(() => {
    let active = true;
    void getConceptSources(classroomSubjectId).then((result) => {
      if (!active) return;
      if (!result.ok) toast.error(result.message);
      setSources(result.ok ? result.sources : []);
    });
    return () => {
      active = false;
    };
  }, [classroomSubjectId]);

  const options = (sources ?? []).flatMap((source) =>
    source.periods
      .filter(({ id }) => !(source.current && id === periodId))
      .map((period) => ({
        value: `${source.classroomSubjectId}:${period.id}`,
        label: [
          source.current
            ? 'Esta materia'
            : `${source.classroom.name}${source.academicYear ? ` (${source.academicYear.name})` : ''}`,
          period.name,
          `${period.concepts.length} ${period.concepts.length === 1 ? 'rango' : 'rangos'}`,
        ].join(' · '),
        concepts: period.concepts,
      })),
  );

  if (sources === null)
    return (
      <p className="text-muted-foreground flex items-center gap-2 text-sm">
        <Spinner /> Buscando conceptos para copiar…
      </p>
    );
  if (!options.length) return null;

  return (
    <div className="flex flex-col gap-1.5">
      <span className="flex items-center gap-1.5 text-sm font-medium">
        <CopyIcon className="size-4" />
        Copiar conceptos de otro periodo / salón
      </span>
      <Select
        items={options}
        value={null}
        onValueChange={(value) => {
          const option = options.find((item) => item.value === value);
          if (option) onCopy(option.concepts);
        }}
      >
        <SelectTrigger className="w-full">
          <SelectValue placeholder="Elige de dónde copiar" />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

function ConceptsEditor({
  classroomSubjectId,
  periodId,
  concepts,
  scale,
  onDone,
}: {
  classroomSubjectId: string;
  periodId: string;
  concepts: SubjectConcept[];
  scale: GradingScale;
  onDone: () => void;
}) {
  const [rows, setRows] = useState(() => toRows(concepts, scale));
  const [pending, startTransition] = useTransition();

  const parsed = rows.map((row) => parseRow(row, scale));
  const valid = parsed.flatMap(({ concept }) => (concept ? [concept] : []));
  const overlap = findOverlap(valid);
  const gaps = findGaps(valid, scale);
  const canSave = valid.length === rows.length && !overlap;

  const update = (key: string, patch: Partial<Row>) =>
    setRows((current) =>
      current.map((row) => (row.key === key ? { ...row, ...patch } : row)),
    );

  // El nuevo rango arranca donde termina el último.
  const addRow = () =>
    setRows((current) => {
      const last = valid.at(-1);
      const step = 10 ** -scale.decimalPlaces;
      const min = last
        ? Math.min(last.maxScore + step, scale.maxScore)
        : scale.minScore;
      return [
        ...current,
        {
          key: crypto.randomUUID(),
          min: formatScore(min, scale),
          max: '',
          text: '',
        },
      ];
    });

  const copy = (source: SubjectConcept[]) => {
    setRows(toRows(source, scale));
    toast.info('Se copiaron los rangos: revísalos y guarda para aplicarlos');
  };

  const save = () =>
    startTransition(async () => {
      const result = await setSubjectConcepts(
        classroomSubjectId,
        periodId,
        [...valid].sort((a, b) => a.minScore - b.minScore),
      );
      if (!result.ok) {
        toast.error(result.message);
        return;
      }
      toast.success(result.message);
      onDone();
    });

  return (
    <div className="flex flex-col gap-4">
      <CopyFromSource
        classroomSubjectId={classroomSubjectId}
        periodId={periodId}
        onCopy={copy}
      />

      {rows.length ? (
        <ul className="flex max-h-[50vh] flex-col gap-3 overflow-y-auto pr-1">
          {rows.map((row, index) => {
            const { error } = parsed[index];
            return (
              <li
                key={row.key}
                className="flex flex-col gap-2 rounded-lg border p-3"
              >
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground text-sm">De</span>
                  <Input
                    aria-label={`Nota mínima del rango ${index + 1}`}
                    inputMode="decimal"
                    className="w-20 text-center tabular-nums"
                    value={row.min}
                    onChange={(event) =>
                      update(row.key, { min: event.target.value })
                    }
                  />
                  <span className="text-muted-foreground text-sm">a</span>
                  <Input
                    aria-label={`Nota máxima del rango ${index + 1}`}
                    inputMode="decimal"
                    className="w-20 text-center tabular-nums"
                    value={row.max}
                    onChange={(event) =>
                      update(row.key, { max: event.target.value })
                    }
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    className="ml-auto"
                    aria-label={`Quitar el rango ${index + 1}`}
                    onClick={() =>
                      setRows((current) =>
                        current.filter(({ key }) => key !== row.key),
                      )
                    }
                  >
                    <Trash2Icon />
                  </Button>
                </div>
                <Textarea
                  aria-label={`Concepto del rango ${index + 1}`}
                  placeholder="Ej. El estudiante superó los logros esperados y demostró buen dominio del tema."
                  maxLength={MAX_TEXT}
                  rows={2}
                  value={row.text}
                  onChange={(event) =>
                    update(row.key, { text: event.target.value })
                  }
                />
                {error && <p className="text-destructive text-xs">{error}</p>}
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="text-muted-foreground rounded-lg border border-dashed px-3 py-6 text-center text-sm">
          Sin rangos: el boletín no mostrará concepto en este periodo.
        </p>
      )}

      <div className="flex flex-wrap items-center justify-between gap-2">
        <Button
          variant="outline"
          size="sm"
          disabled={rows.length >= MAX_CONCEPTS}
          onClick={addRow}
        >
          <PlusIcon data-icon="inline-start" />
          Agregar rango
        </Button>
        <span className="text-muted-foreground text-sm">
          Escala {rangeLabel(scale, scale)}
        </span>
      </div>

      {overlap ? (
        <p className="border-destructive/30 bg-destructive/10 text-destructive rounded-lg border px-3 py-2 text-sm">
          Los rangos {rangeLabel(overlap[0], scale)} y{' '}
          {rangeLabel(overlap[1], scale)} se cruzan.
        </p>
      ) : (
        gaps.length > 0 && (
          <p className="flex items-start gap-2 rounded-lg border border-amber-300/50 bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300">
            <TriangleAlertIcon className="mt-0.5 size-4 shrink-0" />
            <span>
              Sin concepto para las notas de{' '}
              {gaps.map((gap) => rangeLabel(gap, scale)).join(', ')}.
            </span>
          </p>
        )
      )}

      <DialogFooter>
        <DialogClose
          render={<Button variant="outline" type="button" />}
          disabled={pending}
        >
          Cancelar
        </DialogClose>
        <Button onClick={save} disabled={!canSave || pending}>
          {pending && <Spinner data-icon="inline-start" />}
          Guardar conceptos
        </Button>
      </DialogFooter>
    </div>
  );
}

function ConceptsList({
  concepts,
  scale,
}: {
  concepts: SubjectConcept[];
  scale: GradingScale;
}) {
  if (!concepts.length)
    return (
      <p className="text-muted-foreground text-sm">
        El profesor aún no ha definido conceptos para este periodo.
      </p>
    );
  return (
    <ul className="flex flex-col gap-2">
      {concepts.map((concept) => (
        <li
          key={`${concept.minScore}-${concept.maxScore}`}
          className="rounded-lg border p-3 text-sm"
        >
          <span className="font-medium tabular-nums">
            {rangeLabel(concept, scale)}
          </span>
          <p className="text-muted-foreground mt-1">{concept.conceptText}</p>
        </li>
      ))}
    </ul>
  );
}

export function ConceptsDialog({
  classroomSubjectId,
  periodId,
  periodName,
  concepts,
  scale,
  editable,
}: {
  classroomSubjectId: string;
  periodId: string;
  periodName: string;
  concepts: SubjectConcept[];
  scale: GradingScale;
  editable: boolean;
}) {
  const [open, setOpen] = useState(false);
  const gaps = findGaps(concepts, scale);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="outline" />}>
        <MessageSquareQuoteIcon data-icon="inline-start" />
        Conceptos por rango ({concepts.length})
        {editable && concepts.length > 0 && gaps.length > 0 && (
          <TriangleAlertIcon
            aria-label="Hay notas sin concepto"
            className="size-4 text-amber-600 dark:text-amber-400"
          />
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Conceptos por rango · {periodName}</DialogTitle>
          <DialogDescription>
            Define un texto para cada rango de notas. El boletín mostrará, en
            esta materia, el concepto que corresponda a la definitiva de cada
            estudiante en el periodo.
          </DialogDescription>
        </DialogHeader>
        {open &&
          (editable ? (
            <ConceptsEditor
              classroomSubjectId={classroomSubjectId}
              periodId={periodId}
              concepts={concepts}
              scale={scale}
              onDone={() => setOpen(false)}
            />
          ) : (
            <ConceptsList concepts={concepts} scale={scale} />
          ))}
      </DialogContent>
    </Dialog>
  );
}
