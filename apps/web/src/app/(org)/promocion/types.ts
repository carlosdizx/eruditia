import type { EnrollmentStudent } from '../salones/[classroomId]/types';

export type PromotionOutcome = 'promote' | 'repeat' | 'graduate';

// Fila de GET /academic-years con lo que usa el asistente.
export type PromotionYear = {
  id: string;
  name: string;
  startDate: string;
  isActive: boolean;
  status: 'open' | 'closed';
};

type GradeLevel = {
  id: string;
  name: string;
  shortName: string;
  sequenceOrder: number;
  isFinalGrade: boolean;
};

// Salón del año destino con su ocupación actual.
export type PromotionClassroom = {
  id: string;
  name: string;
  capacity: number | null;
  enrolled: number;
};

// Contrato de GET /promotions/preview.
export type PromotionPreview = {
  sourceClassroom: {
    id: string;
    name: string;
    gradeLevel: GradeLevel;
    academicYear: { id: string; name: string };
  };
  targetAcademicYear: { id: string; name: string };
  passingGrade: number;
  sameClassrooms: PromotionClassroom[];
  nextClassrooms: PromotionClassroom[];
  nextGradeLevel: GradeLevel | null;
  suggestedSameClassroomId: string | null;
  suggestedNextClassroomId: string | null;
  students: {
    enrollmentId: string;
    student: EnrollmentStudent;
    finalAverage: number | null;
    promotionNotes: string | null;
    suggestedOutcome: PromotionOutcome | null;
    // Ya cursa en el año destino: no se puede incluir.
    targetEnrollment: { classroomId: string; classroomName: string } | null;
  }[];
};

export type PromotionDecision = {
  enrollmentId: string;
  outcome: PromotionOutcome;
  targetClassroomId?: string;
  finalAverage?: number;
  promotionNotes?: string;
};

export type PromotionResult =
  | { ok: true; promoted: number; repeated: number; graduated: number }
  | { ok: false; message: string };
