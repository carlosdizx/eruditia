// Fila de GET /grade-levels (ordenados por sequenceOrder).
export type GradeLevel = {
  id: string;
  name: string;
  shortName: string;
  sequenceOrder: number;
  isFinalGrade: boolean;
};

export type GradeLevelFormValues = Partial<
  Record<'name' | 'shortName' | 'sequenceOrder' | 'isFinalGrade', string>
>;

export type GradeLevelFormState =
  | { status: 'idle' }
  | { status: 'success'; message: string }
  | { status: 'error'; message: string; values: GradeLevelFormValues };

export type GradeLevelActionResult =
  { ok: true; message: string } | { ok: false; message: string };
