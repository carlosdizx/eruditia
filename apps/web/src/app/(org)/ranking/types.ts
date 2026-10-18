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

// Contrato de GET /rankings/subject-leaders.
export type SubjectLeaders = {
  academicYear: { id: string; name: string };
  period: { id: string; name: string } | null;
  scale: GradingScale;
  classroom: { id: string; name: string };
  subjects: {
    subject: { id: string; name: string };
    teacher: { id: string; firstName: string; lastName: string } | null;
    // Estudiantes con nota en la materia.
    graded: number;
    // Primer puesto (varios si empatan).
    leaders: RankingRow[];
  }[];
};

export const RANKING_VIEWS = [
  { value: 'salon', label: 'Por salón' },
  { value: 'materia', label: 'Por materia' },
  { value: 'destacados', label: 'Mejores por materia' },
] as const;

export type RankingView = (typeof RANKING_VIEWS)[number]['value'];

// Contrato de GET /rankings/honor-roll.
export type HonorRoll = {
  academicYear: { id: string; name: string } | null;
  period: { id: string; name: string } | null;
  scale: GradingScale;
  groups: {
    id: string;
    name: string;
    gradeLevel: { id: string; name: string } | null;
    // Estudiantes con notas que cumplen el filtro.
    total: number;
    rows: RankingRow[];
  }[];
};
