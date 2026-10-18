import {
  findGaps,
  findOverlap,
  resolveConcept,
} from '../../src/gradebooks/utils/concept.util';

describe('concept utils', () => {
  const scale = { minScore: 0, maxScore: 5, decimalPlaces: 1 };
  const low = { minScore: 0, maxScore: 2.9, conceptText: 'Bajo' };
  const mid = { minScore: 3, maxScore: 4, conceptText: 'Básico' };
  const high = { minScore: 4.6, maxScore: 5, conceptText: 'Superior' };

  describe('resolveConcept', () => {
    it('finds the range that contains the score, edges included', () => {
      expect(resolveConcept([low, mid, high], 2.9)).toBe(low);
      expect(resolveConcept([low, mid, high], 3)).toBe(mid);
      expect(resolveConcept([low, mid, high], 5)).toBe(high);
    });

    it('returns null without score or inside a gap', () => {
      expect(resolveConcept([low, mid], null)).toBeNull();
      expect(resolveConcept([low, mid, high], 4.3)).toBeNull();
    });
  });

  describe('findOverlap', () => {
    it('accepts contiguous ranges in any order', () => {
      expect(findOverlap([mid, low, high])).toBeNull();
    });

    it('detects ranges that share a score', () => {
      const other = { minScore: 2.9, maxScore: 3.5 };
      expect(findOverlap([mid, low, other])).toEqual([low, other]);
    });
  });

  describe('findGaps', () => {
    it('reports the uncovered parts of the scale', () => {
      expect(findGaps([low, mid], scale)).toEqual([
        { minScore: 4.1, maxScore: 5 },
      ]);
      expect(findGaps([mid, high], scale)).toEqual([
        { minScore: 0, maxScore: 2.9 },
        { minScore: 4.1, maxScore: 4.5 },
      ]);
    });

    it('is empty when the ranges cover the scale', () => {
      expect(
        findGaps([low, mid, { minScore: 4.1, maxScore: 5 }], scale),
      ).toEqual([]);
    });

    it('uses the scale decimals as the step between ranges', () => {
      expect(
        findGaps(
          [
            { minScore: 1, maxScore: 2.9 },
            { minScore: 2.91, maxScore: 5 },
          ],
          { minScore: 1, maxScore: 5, decimalPlaces: 2 },
        ),
      ).toEqual([]);
    });

    it('covers the whole scale without ranges', () => {
      expect(findGaps([], scale)).toEqual([{ minScore: 0, maxScore: 5 }]);
    });
  });
});
