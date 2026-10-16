import { roundScore } from '@common/utils/score.util';

type Scale = {
  maxScore: number;
  passingScore: number;
  decimalPlaces: number;
};

// passing: proyecta aprobar; at_risk: la proyección no alcanza la aprobatoria;
// failed: terminó reprobando o ya no le alcanza ni con la nota máxima.
export type AnnualStatus = 'passing' | 'at_risk' | 'failed';

export interface AnnualScore {
  // Puntos ganados: suma de definitiva × peso del periodo.
  accumulated: number | null;
  // Promedio ponderado de los periodos calificados: la nota final si sigue así.
  projected: number | null;
  // Promedio que necesita en los periodos sin nota para llegar a la aprobatoria.
  requiredScore: number | null;
  complete: boolean;
  status: AnnualStatus | null;
}

// Acumulado anual de una materia según el peso de cada periodo del año.
const annualScore = (
  periods: { weightPercentage: number; score: number | null }[],
  { maxScore, passingScore, decimalPlaces }: Scale,
): AnnualScore => {
  const totalWeight = periods.reduce(
    (sum, { weightPercentage }) => sum + weightPercentage,
    0,
  );
  const graded = periods.filter(
    (period): period is { weightPercentage: number; score: number } =>
      period.score !== null,
  );
  if (!graded.length || !totalWeight)
    return {
      accumulated: null,
      projected: null,
      requiredScore: null,
      complete: false,
      status: null,
    };

  const gradedWeight = graded.reduce(
    (sum, { weightPercentage }) => sum + weightPercentage,
    0,
  );
  const points = graded.reduce(
    (sum, { score, weightPercentage }) => sum + score * weightPercentage,
    0,
  );
  const accumulated = roundScore(points / totalWeight, decimalPlaces);
  const projected = roundScore(points / gradedWeight, decimalPlaces);
  const remainingWeight = totalWeight - gradedWeight;

  if (remainingWeight <= 0)
    return {
      accumulated,
      projected,
      requiredScore: null,
      complete: true,
      status: projected >= passingScore ? 'passing' : 'failed',
    };

  const required = (passingScore * totalWeight - points) / remainingWeight;
  // Se redondea hacia arriba: con menos no alcanza.
  const factor = 10 ** decimalPlaces;
  const requiredScore = Math.max(
    0,
    Math.ceil(roundScore(required * factor, 6)) / factor,
  );

  return {
    accumulated,
    projected,
    requiredScore,
    complete: false,
    status:
      requiredScore > maxScore
        ? 'failed'
        : projected >= passingScore
          ? 'passing'
          : 'at_risk',
  };
};

export type Recovery = { score: number; notes: string | null };

// Se recupera una materia perdida (acumulado bajo la aprobatoria) con todos
// los periodos calificados.
export const canRecover = (annual: AnnualScore, passingScore: number) =>
  annual.complete &&
  annual.projected !== null &&
  annual.projected < passingScore;

// La nota de recuperación reemplaza el acumulado anual de la materia; se
// conserva el original para mostrarlo.
export const withRecovery = (
  annual: AnnualScore,
  recovery: Recovery | undefined,
  passingScore: number,
): {
  annual: AnnualScore;
  recovery: (Recovery & { originalScore: number | null }) | null;
} => {
  if (!recovery) return { annual, recovery: null };
  return {
    annual: {
      accumulated: recovery.score,
      projected: recovery.score,
      requiredScore: null,
      complete: true,
      status: recovery.score >= passingScore ? 'passing' : 'failed',
    },
    recovery: { ...recovery, originalScore: annual.projected },
  };
};

export default annualScore;
