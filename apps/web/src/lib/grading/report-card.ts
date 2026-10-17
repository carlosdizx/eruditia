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
};

// Contrato de GET /report-cards/me y POST /public/report-cards/:slug.
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
    // Puesto en el salón (acumulado del año); null si el colegio no lo publica.
    rank: { position: number; total: number } | null;
  } | null;
};
