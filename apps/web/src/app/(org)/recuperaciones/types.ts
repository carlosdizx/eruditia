import type { GradingScale } from '@/lib/grading/scale';

export type RecoveryRecord = {
  score: number;
  notes: string | null;
  updatedAt: string;
};

// Contrato de GET /recoveries.
export type RecoveryList = {
  academicYear: { id: string; name: string; status: 'open' | 'closed' } | null;
  scale: GradingScale;
  periods: { id: string; name: string; weightPercentage: number }[];
  subjects: {
    id: string;
    subject: { id: string; name: string; code: string };
    teacher: { id: string; firstName: string; lastName: string } | null;
    classroom: {
      id: string;
      name: string;
      gradeLevel: { name: string } | null;
    };
    students: {
      enrollmentId: string;
      status: string;
      student: {
        id: string;
        studentCode: string;
        firstName: string;
        lastName: string;
      };
      editable: boolean;
      periodScores: Record<string, number | null>;
      // Acumulado anual sin la recuperación.
      originalScore: number | null;
      recovery: RecoveryRecord | null;
    }[];
  }[];
};

export type RecoveryActionResult =
  { ok: true; message: string } | { ok: false; message: string };
