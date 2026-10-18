import rankCandidates, {
  rawWeightedAverage,
} from '../../src/rankings/utils/ranking.util';

const candidate = (
  lastName: string,
  score: number,
  allPassed = true,
  firstName = 'A',
) => ({ lastName, firstName, score, allPassed });

const positions = (rows: { lastName: string; position: number }[]) =>
  rows.map(({ lastName, position }) => [position, lastName]);

describe('rankCandidates', () => {
  it('orders by score and shares the position on ties', () => {
    expect(
      positions(
        rankCandidates(
          [
            candidate('Ruiz', 4.2),
            candidate('Gil', 4.5),
            candidate('Arias', 4.2),
            candidate('Paz', 3.9),
          ],
          { prioritizeAllPassed: false },
        ),
      ),
    ).toEqual([
      [1, 'Gil'],
      [2, 'Arias'],
      [2, 'Ruiz'],
      [4, 'Paz'],
    ]);
  });

  it('breaks ties with four decimals', () => {
    expect(
      positions(
        rankCandidates(
          [candidate('Ruiz', 4.12341), candidate('Gil', 4.12349)],
          { prioritizeAllPassed: false },
        ),
      ),
    ).toEqual([
      [1, 'Gil'],
      [2, 'Ruiz'],
    ]);
    expect(
      positions(
        rankCandidates(
          [candidate('Ruiz', 4.123401), candidate('Gil', 4.123404)],
          { prioritizeAllPassed: false },
        ),
      ),
    ).toEqual([
      [1, 'Gil'],
      [1, 'Ruiz'],
    ]);
  });

  it('puts students without failed subjects first in the general ranking', () => {
    const candidates = [candidate('Gil', 4.8, false), candidate('Ruiz', 4)];

    expect(
      positions(rankCandidates(candidates, { prioritizeAllPassed: true })),
    ).toEqual([
      [1, 'Ruiz'],
      [2, 'Gil'],
    ]);
    expect(
      positions(rankCandidates(candidates, { prioritizeAllPassed: false })),
    ).toEqual([
      [1, 'Gil'],
      [2, 'Ruiz'],
    ]);
  });
});

describe('rawWeightedAverage', () => {
  it('weights without rounding', () => {
    expect(
      rawWeightedAverage([
        { score: 4, weight: 2 },
        { score: 3, weight: 1 },
      ]),
    ).toBeCloseTo(3.6667, 4);
    expect(rawWeightedAverage([])).toBeNull();
  });
});
