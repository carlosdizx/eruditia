// Respuesta de GET /grading-scale.
export type GradingScale = {
  minScore: number;
  maxScore: number;
  passingScore: number;
  decimalPlaces: number;
  isDefault: boolean;
};

export const formatScore = (score: number, { decimalPlaces }: GradingScale) =>
  score.toFixed(decimalPlaces);

export const isPassing = (score: number, { passingScore }: GradingScale) =>
  score >= passingScore;
