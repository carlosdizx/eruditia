// Respuesta de GET /grading-scale.
export type GradingScale = {
  minScore: number;
  maxScore: number;
  passingScore: number;
  decimalPlaces: number;
  // Materias reprobadas con las que se reprueba el año; null: no aplica.
  maxFailedSubjects: number | null;
  isDefault: boolean;
};

export const formatScore = (score: number, { decimalPlaces }: GradingScale) =>
  score.toFixed(decimalPlaces);

export const isPassing = (score: number, { passingScore }: GradingScale) =>
  score >= passingScore;

const roundScore = (value: number, decimalPlaces: number) => {
  const factor = 10 ** decimalPlaces;
  return Math.round((value + Number.EPSILON) * factor) / factor;
};

const hasAtMostDecimals = (value: number, decimalPlaces: number) => {
  const scaled = value * 10 ** decimalPlaces;
  return Math.abs(Math.round(scaled) - scaled) < 1e-6;
};

export type ParsedScore =
  { ok: true; score: number | null } | { ok: false; message: string };

// Lo que digita el profesor: vacío borra la nota; acepta coma decimal.
export const parseScore = (raw: string, scale: GradingScale): ParsedScore => {
  const text = raw.trim().replace(',', '.');
  if (!text) return { ok: true, score: null };

  const score = Number(text);
  if (Number.isNaN(score)) return { ok: false, message: 'No es un número' };
  if (score < scale.minScore || score > scale.maxScore)
    return {
      ok: false,
      message: `Debe estar entre ${formatScore(scale.minScore, scale)} y ${formatScore(scale.maxScore, scale)}`,
    };
  if (!hasAtMostDecimals(score, scale.decimalPlaces))
    return {
      ok: false,
      message: `Máximo ${scale.decimalPlaces} ${scale.decimalPlaces === 1 ? 'decimal' : 'decimales'}`,
    };
  return { ok: true, score };
};

// Espejo de periodScore de la API: promedio ponderado de las actividades
// calificadas, normalizado por sus pesos. Null sin notas.
export const periodScore = (
  grades: { score: number; weightPercentage: number }[],
  decimalPlaces: number,
) => {
  const totalWeight = grades.reduce(
    (sum, { weightPercentage }) => sum + weightPercentage,
    0,
  );
  if (!totalWeight) return null;

  const weighted = grades.reduce(
    (sum, { score, weightPercentage }) => sum + score * weightPercentage,
    0,
  );
  return roundScore(weighted / totalWeight, decimalPlaces);
};
