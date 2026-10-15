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
