// Espejo de annualScore de la API.
export type AnnualStatus = 'passing' | 'at_risk' | 'failed';

export type AnnualScore = {
  accumulated: number | null;
  projected: number | null;
  requiredScore: number | null;
  complete: boolean;
  status: AnnualStatus | null;
};

// Nota con la que se recuperó una materia perdida; reemplaza el acumulado.
export type SubjectRecovery = {
  score: number;
  notes: string | null;
  originalScore: number | null;
};

export const annualStatusLabel = (
  { status, complete }: AnnualScore,
  recovered = false,
) => {
  if (!status) return 'Sin notas';
  if (recovered) return status === 'passing' ? 'Recuperada' : 'No recuperó';
  if (status === 'passing') return complete ? 'Aprobada' : 'Aprobando';
  if (status === 'at_risk') return 'En riesgo';
  return 'Reprobada';
};
