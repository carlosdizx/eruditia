import periodScore from '../../src/gradebooks/utils/period-score.util';
import { hasAtMostDecimals, roundScore } from '@common/utils/score.util';

describe('periodScore', () => {
  it('is null without grades', () => {
    expect(periodScore([], 1)).toBeNull();
  });

  it('weights each activity', () => {
    expect(
      periodScore(
        [
          { score: 4, weightPercentage: 60 },
          { score: 3, weightPercentage: 40 },
        ],
        1,
      ),
    ).toBe(3.6);
  });

  it('normalizes by the graded weights while activities are missing', () => {
    expect(periodScore([{ score: 4.5, weightPercentage: 30 }], 1)).toBe(4.5);
  });

  it('rounds to the scale decimals', () => {
    expect(
      periodScore(
        [
          { score: 3.33, weightPercentage: 50 },
          { score: 4, weightPercentage: 50 },
        ],
        2,
      ),
    ).toBe(3.67);
  });
});

describe('score utils', () => {
  it.each([
    [2.675, 2, 2.68],
    [3.45, 1, 3.5],
    [4, 1, 4],
  ])('roundScore(%p, %p) = %p', (value, decimals, expected) => {
    expect(roundScore(value, decimals)).toBe(expected);
  });

  it('checks the allowed decimals', () => {
    expect(hasAtMostDecimals(3.5, 1)).toBe(true);
    expect(hasAtMostDecimals(3.25, 1)).toBe(false);
    expect(hasAtMostDecimals(3.25, 2)).toBe(true);
  });
});
