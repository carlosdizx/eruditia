import type { AnnualScore, SubjectRecovery } from './annual';
import type { GradingScale } from './scale';

export type ReportCardPeriod = {
  id: string;
  name: string;
  orderIndex: number;
  weightPercentage: number;
};

export type ReportCardSubject = {
  id: string;
  weightInGpa: number;
  subject: { id: string; name: string; areaName: string | null };
  teacher: { firstName: string; lastName: string } | null;
  periods: Record<
    string,
    {
      score: number | null;
      observation: string | null;
      // Concepto del profesor según el rango en que cae la definitiva.
      concept: string | null;
      activities: {
        title: string;
        weightPercentage: number;
        score: number | null;
      }[];
    }
  >;
  annual: AnnualScore;
  recovery: SubjectRecovery | null;
};

export type ReportCardYear = {
  id: string;
  name: string;
  status: 'open' | 'closed';
  // Solo en GET /enrollments/:id/report-card (el panel navega por matrícula).
  enrollmentId?: string;
};

export type ClassroomPosition = { position: number; total: number };

// Contrato de GET /report-cards/me, GET /enrollments/:id/report-card y
// POST /public/organizations/:slug/report-card.
export type ReportCardResponse = {
  organization: { name: string; logoUrl: string | null };
  student: {
    firstName: string;
    lastName: string;
    documentType: string;
    documentNumber: string;
    studentCode: string;
  };
  years: ReportCardYear[];
  reportCard: {
    academicYear: ReportCardYear;
    classroom: { name: string; gradeLevel: { name: string } | null };
    enrollmentStatus: string;
    scale: GradingScale;
    periods: ReportCardPeriod[];
    subjects: ReportCardSubject[];
    averages: {
      periods: Record<string, number | null>;
      general: number | null;
    };
    // Puesto en el salón, anual y por periodo; null si el colegio no lo
    // publica.
    rank: {
      annual: ClassroomPosition | null;
      periods: Record<string, ClassroomPosition | null>;
    } | null;
  } | null;
};
