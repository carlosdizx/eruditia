import type { AnnualScore } from '@/lib/grading/annual';
import type { GradingScale } from '@/lib/grading/scale';

export type GradebookPeriod = {
  id: string;
  name: string;
  orderIndex: number;
  weightPercentage: number;
  isOpenForGrading: boolean;
};

export type EvaluationItem = {
  id: string;
  title: string;
  weightPercentage: number;
  sortOrder: number;
};

export type GradebookStudent = {
  enrollmentId: string;
  status: string;
  student: {
    id: string;
    studentCode: string;
    documentType: string;
    documentNumber: string;
    firstName: string;
    lastName: string;
  };
  editable: boolean;
  grades: Record<string, { score: number; feedback: string | null }>;
  finalPeriodScore: number | null;
  isPassed: boolean | null;
  teacherObservation: string | null;
};

// Por qué no se puede editar (null: se puede).
export type GradebookLock = 'read_only' | 'year_closed' | 'period_closed';

// Contrato de GET /gradebooks/:classroomSubjectId.
export type Gradebook = {
  classroomSubject: {
    id: string;
    subject: {
      id: string;
      name: string;
      code: string;
      areaName: string | null;
    };
    teacher: { id: string; firstName: string; lastName: string } | null;
  };
  classroom: { id: string; name: string; gradeLevel: { name: string } | null };
  academicYear: { id: string; name: string; status: 'open' | 'closed' };
  periods: GradebookPeriod[];
  scale: GradingScale;
  period: GradebookPeriod | null;
  lock: GradebookLock | null;
  items: EvaluationItem[];
  students: GradebookStudent[];
};

// Contrato de GET /gradebooks/:classroomSubjectId/annual.
export type AnnualSummary = Pick<
  Gradebook,
  'classroomSubject' | 'classroom' | 'academicYear' | 'periods' | 'scale'
> & {
  students: (Pick<GradebookStudent, 'enrollmentId' | 'status' | 'student'> & {
    periodScores: Record<string, number | null>;
    annual: AnnualScore;
  })[];
};

// Contrato de GET /classrooms/:classroomId/gradebooks.
export type ClassroomGradebooks = {
  classroom: { id: string; name: string; gradeLevel: { name: string } | null };
  homeroom: boolean;
  gradebooks: {
    id: string;
    subject: { id: string; name: string; code: string };
    teacher: { id: string; firstName: string; lastName: string } | null;
    canManage: boolean;
  }[];
};

export type StudentGradesPayload = {
  enrollmentId: string;
  grades?: { evaluationItemId: string; score: number | null }[];
  teacherObservation?: string | null;
};

export type EvaluationItemPayload = {
  id?: string;
  title: string;
  weightPercentage: number;
};

export type GradebookActionResult =
  | { ok: true; message: string; gradebook: Gradebook }
  | { ok: false; message: string };
