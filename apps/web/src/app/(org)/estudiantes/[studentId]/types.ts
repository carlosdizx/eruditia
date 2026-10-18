import type {
  EnrollmentStatus,
  EnrollmentStudent,
} from '../../salones/[classroomId]/types';

// Una matrícula del historial: el año, el salón y cómo terminó.
export type HistoryEnrollment = {
  id: string;
  classroomId: string;
  enrollmentDate: string;
  status: EnrollmentStatus;
  finalAverage: number | null;
  // Calculado de las planillas al promover; si difiere, se ajustó a mano.
  computedAverage: number | null;
  promotionNotes: string | null;
  promotedFromEnrollmentId: string | null;
  academicYear: {
    id: string;
    name: string;
    startDate: string;
    endDate: string;
    status: 'open' | 'closed';
  } | null;
  classroom: {
    id: string;
    name: string;
    homeroomTeacherId: string | null;
    gradeLevel: {
      id: string;
      name: string;
      shortName: string;
      sequenceOrder: number;
      isFinalGrade: boolean;
    } | null;
  } | null;
};

// Contrato de GET /students/:id/enrollments (del más antiguo al más reciente).
export type StudentHistory = {
  student: EnrollmentStudent;
  enrollments: HistoryEnrollment[];
};
