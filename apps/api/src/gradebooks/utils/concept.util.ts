type ConceptRange = { minScore: number; maxScore: number };

// Tolerancia para comparar decimales que llegan de Postgres o de un cálculo.
const EPSILON = 1e-6;

const byMinScore = <T extends ConceptRange>(concepts: T[]) =>
  [...concepts].sort((a, b) => a.minScore - b.minScore);

// Concepto cuyo rango contiene la nota (null sin nota o si cae en un hueco).
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

// Primer par de rangos que se cruzan (ordenados por nota mínima), o null.
export const findOverlap = <T extends ConceptRange>(
  concepts: T[],
): [T, T] | null => {
  const sorted = byMinScore(concepts);
  for (let index = 1; index < sorted.length; index++)
    if (sorted[index].minScore <= sorted[index - 1].maxScore + EPSILON)
      return [sorted[index - 1], sorted[index]];
  return null;
};

// Tramos de la escala que ningún rango cubre. Con 1 decimal, 2.9 y 3.0 son
// contiguos: el paso mínimo entre notas es 10^-decimales.
export const findGaps = (
  concepts: ConceptRange[],
  {
    minScore,
    maxScore,
    decimalPlaces,
  }: { minScore: number; maxScore: number; decimalPlaces: number },
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
