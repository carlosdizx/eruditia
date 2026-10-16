// Espejo de annualScore de la API.
export type AnnualStatus = 'passing' | 'at_risk' | 'failed';

export type AnnualScore = {
  accumulated: number | null;
  projected: number | null;
  requiredScore: number | null;
  complete: boolean;
  status: AnnualStatus | null;
};

export const annualStatusLabel = ({ status, complete }: AnnualScore) => {
  if (!status) return 'Sin notas';
  if (status === 'passing') return complete ? 'Aprobada' : 'Aprobando';
  if (status === 'at_risk') return 'En riesgo';
  return 'Reprobada';
};
