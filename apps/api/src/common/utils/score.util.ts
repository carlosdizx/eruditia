export const roundScore = (value: number, decimalPlaces: number) => {
  const factor = 10 ** decimalPlaces;
  return Math.round((value + Number.EPSILON) * factor) / factor;
};

export const hasAtMostDecimals = (value: number, decimalPlaces: number) => {
  const scaled = value * 10 ** decimalPlaces;
  return Math.abs(Math.round(scaled) - scaled) < 1e-6;
};
