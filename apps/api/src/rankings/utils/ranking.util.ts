import { roundScore } from '@common/utils/score.util';

// Precisión con la que se compara para desempatar.
const TIE_DECIMALS = 4;

type Weighted = { score: number; weight: number };

// Promedio ponderado sin redondear; null sin notas.
export const rawWeightedAverage = (values: Weighted[]) => {
  const totalWeight = values.reduce((sum, { weight }) => sum + weight, 0);
  if (!totalWeight) return null;
  return (
    values.reduce((sum, { score, weight }) => sum + score * weight, 0) /
    totalWeight
  );
};

export interface RankingCandidate {
  score: number;
  // En el ranking general, quien no perdió materias va antes que quien sí.
  allPassed: boolean;
  firstName: string;
  lastName: string;
}

// Ordena y asigna puestos: mayor nota (a 4 decimales) primero; si empatan
// comparten el puesto (1, 1, 3) y se listan por apellido y nombre.
const rankCandidates = <T extends RankingCandidate>(
  candidates: T[],
  { prioritizeAllPassed }: { prioritizeAllPassed: boolean },
) => {
  const keyOf = (candidate: T) => ({
    passed: prioritizeAllPassed && candidate.allPassed ? 1 : 0,
    score: roundScore(candidate.score, TIE_DECIMALS),
  });
  const sorted = [...candidates].sort((a, b) => {
    const [left, right] = [keyOf(a), keyOf(b)];
    return (
      right.passed - left.passed ||
      right.score - left.score ||
      a.lastName.localeCompare(b.lastName, 'es') ||
      a.firstName.localeCompare(b.firstName, 'es')
    );
  });

  let position = 0;
  return sorted.map((candidate, index) => {
    const previous = sorted[index - 1];
    const tied =
      previous &&
      keyOf(previous).passed === keyOf(candidate).passed &&
      keyOf(previous).score === keyOf(candidate).score;
    if (!tied) position = index + 1;
    return { ...candidate, position };
  });
};

export default rankCandidates;
