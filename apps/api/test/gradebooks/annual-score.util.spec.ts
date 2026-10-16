import annualScore from '../../src/gradebooks/utils/annual-score.util';

describe('annualScore', () => {
  const scale = { maxScore: 5, passingScore: 3, decimalPlaces: 1 };
  const periods = (...scores: (number | null)[]) =>
    scores.map((score) => ({ weightPercentage: 25, score }));

  it('is empty without grades', () => {
    expect(annualScore(periods(null, null, null, null), scale)).toEqual({
      accumulated: null,
      projected: null,
      requiredScore: null,
      complete: false,
      status: null,
    });
  });

  it('accumulates points and projects with the graded periods', () => {
    expect(annualScore(periods(4, 3, null, null), scale)).toEqual({
      accumulated: 1.8,
      projected: 3.5,
      requiredScore: 2.5,
      complete: false,
      status: 'passing',
    });
  });

  it('flags the risk when the projection is below the passing score', () => {
    expect(annualScore(periods(2, null, null, null), scale)).toMatchObject({
      projected: 2,
      requiredScore: 3.4,
      status: 'at_risk',
    });
  });

  it('fails when not even the maximum score is enough', () => {
    expect(annualScore(periods(1, 1, 1, null), scale)).toMatchObject({
      requiredScore: 9,
      status: 'failed',
    });
  });

  it('closes the year with the final score', () => {
    expect(annualScore(periods(3, 3, 2.5, 3.5), scale)).toMatchObject({
      accumulated: 3,
      complete: true,
      requiredScore: null,
      status: 'passing',
    });
    expect(annualScore(periods(3, 3, 2.5, 3), scale)).toMatchObject({
      accumulated: 2.9,
      status: 'failed',
    });
  });

  it('uses each period weight', () => {
    expect(
      annualScore(
        [
          { weightPercentage: 20, score: 5 },
          { weightPercentage: 80, score: null },
        ],
        scale,
      ),
    ).toMatchObject({ accumulated: 1, requiredScore: 2.5 });
  });

  it('never asks for less than zero', () => {
    expect(annualScore(periods(5, 5, 5, null), scale)).toMatchObject({
      requiredScore: 0,
      status: 'passing',
    });
  });
});
