import type { GradingScale } from '@/lib/grading/scale';

// Contrato de GET /rankings/options.
export type RankingOptions = {
  academicYear: { id: string; name: string; status: 'open' | 'closed' } | null;
  periods: { id: string; name: string; orderIndex: number }[];
  classrooms: {
    id: string;
    name: string;
    gradeLevel: { id: string; name: string } | null;
    // Puede ver el ranking general (admin o director de grupo).
    general: boolean;
    // Materias del salón cuyo ranking puede ver.
    subjectIds: string[];
  }[];
  subjects: { id: string; name: string }[];
};

export type RankingRow = {
  position: number;
  enrollmentId: string;
  student: {
    id: string;
    studentCode: string;
    documentType: string;
    documentNumber: string;
    firstName: string;
    lastName: string;
  };
  classroom: { id: string; name: string };
  score: number;
  gradedSubjects: number;
  passedSubjects: number;
  failedSubjects: number;
};

// Contrato de GET /rankings.
export type Ranking = {
  academicYear: { id: string; name: string } | null;
  period: { id: string; name: string } | null;
  scale: GradingScale;
  scope: {
    classroom: { id: string; name: string } | null;
    gradeLevel: { id: string; name: string } | null;
    subject: { id: string; name: string } | null;
  };
  // Estudiantes con nota que cumplen el filtro, antes del top N.
  total: number;
  rows: RankingRow[];
};

// Valor de ?periodo= para el acumulado del año.
export const ANNUAL = 'anual';
