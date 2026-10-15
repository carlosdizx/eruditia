import type { Teacher } from '../types';

// Fila de GET /classrooms/:id/subjects.
export type ClassroomSubject = {
  id: string;
  subjectId: string;
  teacherId: string | null;
  weeklyHours: number | null;
  weightInGpa: number;
  subject: { id: string; name: string; code: string; areaName: string | null };
  teacher: Teacher | null;
};

export type AssignmentFormValues = Partial<
  Record<'subjectId' | 'teacherId' | 'weeklyHours' | 'weightInGpa', string>
>;

export type AssignmentFormState =
  | { status: 'idle' }
  | { status: 'success'; message: string }
  | { status: 'error'; message: string; values: AssignmentFormValues };

export type AssignmentActionResult =
  { ok: true } | { ok: false; message: string };

export const ENROLLMENT_STATUSES = [
  { value: 'in_progress', label: 'Cursando' },
  { value: 'promoted', label: 'Promovido' },
  { value: 'failed', label: 'Reprobado' },
  { value: 'withdrawn', label: 'Retirado' },
  { value: 'graduated', label: 'Graduado' },
  { value: 'transferred', label: 'Trasladado' },
] as const;

export type EnrollmentStatus = (typeof ENROLLMENT_STATUSES)[number]['value'];

export const ENROLLMENT_STATUS_LABELS = Object.fromEntries(
  ENROLLMENT_STATUSES.map(({ value, label }) => [value, label]),
) as Record<EnrollmentStatus, string>;

// Estudiante tal como lo devuelven las matrículas y los candidatos.
export type EnrollmentStudent = {
  id: string;
  studentCode: string;
  documentType: string;
  documentNumber: string;
  firstName: string;
  lastName: string;
  status: string;
};

// Fila de GET /classrooms/:id/enrollments.
export type Enrollment = {
  id: string;
  studentId: string;
  classroomId: string;
  enrollmentDate: string;
  status: EnrollmentStatus;
  finalAverage: number | null;
  promotionNotes: string | null;
  student: EnrollmentStudent;
};

export type EnrollmentActionResult =
  { ok: true; message: string } | { ok: false; message: string };
