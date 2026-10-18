import annualResults from '../../src/gradebooks/utils/annual-results.util';

describe('annualResults', () => {
  const scale = { maxScore: 5, passingScore: 3, decimalPlaces: 1 };
  const periods = [
    { id: 'p1', weightPercentage: 50 },
    { id: 'p2', weightPercentage: 50 },
  ];
  const subjects = [
    { id: 'math', weightInGpa: 2, subject: { name: 'Matemáticas' } },
    { id: 'art', weightInGpa: 1, subject: { name: 'Artes' } },
  ];
  const scores: Record<string, number> = {
    'math:p1': 4,
    'math:p2': 3,
    'art:p1': 2,
    'art:p2': 2.5,
  };
  const resultOf = (subjectId: string, periodId: string) => {
    const score = scores[`${subjectId}:${periodId}`];
    return score === undefined ? undefined : { score, observation: null };
  };

  it('weights each subject in the general average', () => {
    const result = annualResults(periods, subjects, resultOf, scale);

    // Matemáticas 3.5 (peso 2), Artes 2.3 (peso 1).
    expect(result.subjects.map(({ annual }) => annual.projected)).toEqual([
      3.5, 2.3,
    ]);
    expect(result.averages).toEqual({
      periods: { p1: 3.3, p2: 2.8 },
      general: 3.1,
    });
    expect(result.failedSubjects.map(({ id }) => id)).toEqual(['art']);
    expect(result.incomplete).toBe(false);
  });

  it('flags missing period grades as incomplete', () => {
    const result = annualResults(
      periods,
      subjects,
      (subjectId, periodId) =>
        periodId === 'p2' ? undefined : resultOf(subjectId, periodId),
      scale,
    );

    expect(result.incomplete).toBe(true);
    expect(result.subjects[0].periods.p2).toEqual({
      score: null,
      observation: null,
    });
  });

  it('uses the recovery instead of the lost subject', () => {
    const result = annualResults(periods, subjects, resultOf, scale, (id) =>
      id === 'art' ? { score: 3.5, notes: 'Examen' } : undefined,
    );

    expect(result.subjects[1]).toMatchObject({
      annual: { projected: 3.5, status: 'passing' },
      recovery: { score: 3.5, originalScore: 2.3 },
    });
    expect(result.failedSubjects).toEqual([]);
    // (3.5 × 2 + 3.5 × 1) / 3
    expect(result.averages.general).toBe(3.5);
  });

  it('has no average without grades', () => {
    const result = annualResults(periods, subjects, () => undefined, scale);

    expect(result.averages.general).toBeNull();
    expect(result.failedSubjects).toEqual([]);
  });
});
