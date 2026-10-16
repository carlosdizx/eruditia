import { roundScore } from '@common/utils/score.util';
import type { GradingScale } from '../../grading-scales/grading-scales.service';
import annualScore, { type Recovery, withRecovery } from './annual-score.util';

export type ResultPeriod = { id: string; weightPercentage: number };

export type ResultSubject = {
  id: string;
  weightInGpa: number;
  subject?: { name: string } | null;
};

export type PeriodResult = { score: number | null; observation: string | null };

type Weighted = { score: number | null; weight: number };

// Promedio ponderado de las notas presentes; null si no hay ninguna.
export const weightedAverage = (values: Weighted[], decimalPlaces: number) => {
  const graded = values.filter(
    (value): value is { score: number; weight: number } => value.score !== null,
  );
  const totalWeight = graded.reduce((sum, { weight }) => sum + weight, 0);
  if (!totalWeight) return null;
  return roundScore(
    graded.reduce((sum, { score, weight }) => sum + score * weight, 0) /
      totalWeight,
    decimalPlaces,
  );
};

// Resultado anual de una matrícula: acumulado de cada materia y promedios
// generales ponderados por el peso de cada materia. Una materia se pierde si
// su acumulado (o su recuperación) queda por debajo de la aprobatoria.
const annualResults = <TSubject extends ResultSubject>(
  periods: ResultPeriod[],
  subjects: TSubject[],
  resultOf: (subjectId: string, periodId: string) => PeriodResult | undefined,
  scale: Pick<GradingScale, 'maxScore' | 'passingScore' | 'decimalPlaces'>,
  recoveryOf: (subjectId: string) => Recovery | undefined = () => undefined,
) => {
  const results = subjects.map((subject) => {
    const periodResults = Object.fromEntries(
      periods.map(({ id }) => [
        id,
        resultOf(subject.id, id) ?? { score: null, observation: null },
      ]),
    );
    const original = annualScore(
      periods.map(({ id, weightPercentage }) => ({
        weightPercentage,
        score: periodResults[id].score,
      })),
      scale,
    );
    return {
      ...subject,
      periods: periodResults,
      ...withRecovery(original, recoveryOf(subject.id), scale.passingScore),
    };
  });

  return {
    subjects: results,
    averages: {
      periods: Object.fromEntries(
        periods.map(({ id }) => [
          id,
          weightedAverage(
            results.map(({ periods: byPeriod, weightInGpa }) => ({
              score: byPeriod[id].score,
              weight: weightInGpa,
            })),
            scale.decimalPlaces,
          ),
        ]),
      ),
      general: weightedAverage(
        results.map(({ annual, weightInGpa }) => ({
          score: annual.projected,
          weight: weightInGpa,
        })),
        scale.decimalPlaces,
      ),
    },
    failedSubjects: results.filter(
      ({ annual }) =>
        annual.projected !== null && annual.projected < scale.passingScore,
    ),
    // Alguna materia tiene periodos sin definitiva.
    incomplete: results.some(({ annual }) => !annual.complete),
  };
};

export default annualResults;
