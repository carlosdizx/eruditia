// Contratos de /academic-years.
export type AcademicPeriod = {
  id: string;
  name: string;
  orderIndex: number;
  weightPercentage: number;
  isOpenForGrading: boolean;
};

export type AcademicYear = {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  isActive: boolean;
  status: 'open' | 'closed';
  periods: AcademicPeriod[];
};

// Fila del editor de periodos: sin id es un periodo nuevo.
export type PeriodDraft = {
  key: string;
  id?: string;
  name: string;
  weightPercentage: string;
};

export type AcademicYearFormValues = Partial<
  Record<'name' | 'startDate' | 'endDate' | 'periods', string>
>;

export type AcademicYearFormState =
  | { status: 'idle' }
  | { status: 'success'; message: string }
  | { status: 'error'; message: string; values: AcademicYearFormValues };

export type AcademicYearActionResult =
  { ok: true } | { ok: false; message: string };
