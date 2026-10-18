// Fila de GET /subjects.
export type Subject = {
  id: string;
  name: string;
  code: string;
  areaName: string | null;
};

export type SubjectFormValues = Partial<
  Record<'name' | 'code' | 'areaName', string>
>;

export type SubjectFormState =
  | { status: 'idle' }
  | { status: 'success'; message: string }
  | { status: 'error'; message: string; values: SubjectFormValues };

export type SubjectActionResult =
  { ok: true; message: string } | { ok: false; message: string };
