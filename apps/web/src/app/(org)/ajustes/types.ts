export type GradingScaleFormValues = Partial<
  Record<
    | 'minScore'
    | 'maxScore'
    | 'passingScore'
    | 'decimalPlaces'
    | 'maxFailedSubjects',
    string
  >
>;

export type GradingScaleFormState =
  | { status: 'idle' }
  | { status: 'success'; message: string }
  | { status: 'error'; message: string; values: GradingScaleFormValues };
