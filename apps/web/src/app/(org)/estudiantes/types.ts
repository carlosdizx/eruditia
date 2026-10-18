export const STUDENT_STATUSES = [
  { value: 'active', label: 'Activo' },
  { value: 'withdrawn', label: 'Retirado' },
  { value: 'graduated', label: 'Graduado' },
  { value: 'suspended', label: 'Suspendido' },
] as const;

export type StudentStatus = (typeof STUDENT_STATUSES)[number]['value'];

export const STUDENT_STATUS_LABELS = Object.fromEntries(
  STUDENT_STATUSES.map(({ value, label }) => [value, label]),
) as Record<StudentStatus, string>;

export const DOCUMENT_TYPES = [
  { value: 'RC', label: 'Registro civil' },
  { value: 'TI', label: 'Tarjeta de identidad' },
  { value: 'CC', label: 'Cédula de ciudadanía' },
  { value: 'OTRO', label: 'Otro' },
] as const;

export type DocumentType = (typeof DOCUMENT_TYPES)[number]['value'];

// Normaliza ?status= de la URL; cualquier otro valor equivale a "todos".
export const parseStatusFilter = (
  value: string | string[] | undefined,
): StudentStatus | undefined =>
  STUDENT_STATUSES.find((status) => status.value === value)?.value;

// Fila de GET /students.
export type Student = {
  id: string;
  userId: string | null;
  studentCode: string;
  documentType: DocumentType;
  documentNumber: string;
  firstName: string;
  lastName: string;
  birthDate: string | null;
  guardianName: string | null;
  guardianPhone: string | null;
  guardianEmail: string | null;
  status: StudentStatus;
};

export type StudentFormValues = Partial<
  Record<
    | 'firstName'
    | 'lastName'
    | 'documentType'
    | 'documentNumber'
    | 'studentCode'
    | 'birthDate'
    | 'guardianName'
    | 'guardianPhone'
    | 'guardianEmail'
    | 'status',
    string
  >
>;

export type StudentFormState =
  | { status: 'idle' }
  | { status: 'success'; message: string }
  | { status: 'error'; message: string; values: StudentFormValues };

// Respuesta de POST /students/import.
export type StudentsImportSummary = {
  total: number;
  created: number;
  failed: number;
  errors: { line: number; documentNumber: string | null; messages: string[] }[];
};

export type StudentsImportState =
  | { status: 'idle' }
  | { status: 'done'; summary: StudentsImportSummary }
  | { status: 'error'; message: string };

export type StudentActionResult = { ok: true } | { ok: false; message: string };
