import type { GradingScale } from './scale';

// Concepto evaluativo que el profesor redacta para un rango de notas.
export type SubjectConcept = {
  id?: string;
  minScore: number;
  maxScore: number;
  conceptText: string;
};

type ConceptRange = Pick<SubjectConcept, 'minScore' | 'maxScore'>;

const EPSILON = 1e-6;

const byMinScore = <T extends ConceptRange>(concepts: T[]) =>
  [...concepts].sort((a, b) => a.minScore - b.minScore);

// Espejo de resolveConcept de la API.
export const resolveConcept = <T extends ConceptRange>(
  concepts: T[],
  score: number | null,
): T | null =>
  score === null
    ? null
    : (concepts.find(
        ({ minScore, maxScore }) =>
          score >= minScore - EPSILON && score <= maxScore + EPSILON,
      ) ?? null);

// Espejo de findOverlap de la API.
export const findOverlap = <T extends ConceptRange>(
  concepts: T[],
): [T, T] | null => {
  const sorted = byMinScore(concepts);
  for (let index = 1; index < sorted.length; index++)
    if (sorted[index].minScore <= sorted[index - 1].maxScore + EPSILON)
      return [sorted[index - 1], sorted[index]];
  return null;
};

// Espejo de findGaps de la API: tramos de la escala sin concepto.
export const findGaps = (
  concepts: ConceptRange[],
  { minScore, maxScore, decimalPlaces }: GradingScale,
): ConceptRange[] => {
  const step = 10 ** -decimalPlaces;
  const round = (value: number) => Number(value.toFixed(decimalPlaces));
  const gaps: ConceptRange[] = [];
  let next = minScore;

  for (const concept of byMinScore(concepts)) {
    if (concept.minScore > next + EPSILON)
      gaps.push({
        minScore: round(next),
        maxScore: round(concept.minScore - step),
      });
    next = Math.max(next, round(concept.maxScore + step));
  }
  if (next <= maxScore + EPSILON)
    gaps.push({ minScore: round(next), maxScore: round(maxScore) });

  return gaps;
};
