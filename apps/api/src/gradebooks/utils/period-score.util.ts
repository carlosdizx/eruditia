import { roundScore } from '@common/utils/score.util';

// Definitiva del periodo: promedio ponderado de las actividades calificadas,
// normalizado por sus pesos para que la nota parcial tenga sentido mientras
// faltan actividades. Null si no tiene ninguna nota.
const periodScore = (
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

export default periodScore;
