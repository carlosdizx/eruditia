// Fila de GET /classrooms?academicYearId=.
export type Classroom = {
  id: string;
  academicYearId: string;
  gradeLevelId: string;
  name: string;
  capacity: number | null;
  gradeLevel: {
    id: string;
    name: string;
    shortName: string;
    sequenceOrder: number;
  } | null;
  homeroomTeacher: Teacher | null;
};

// GET /classrooms/teachers: profesores activos de la organización.
export type Teacher = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
};

export type GradeLevelOption = {
  id: string;
  name: string;
  shortName: string;
};

// Valor del select para "sin director de grupo".
export const NO_TEACHER = 'none';

export type ClassroomFormValues = Partial<
  Record<'gradeLevelId' | 'name' | 'homeroomTeacherId' | 'capacity', string>
>;

export type ClassroomFormState =
  | { status: 'idle' }
  | { status: 'success'; message: string }
  | { status: 'error'; message: string; values: ClassroomFormValues };

export type ClassroomActionResult =
  { ok: true } | { ok: false; message: string };

export type CopyStructureResult =
  { ok: true; message: string } | { ok: false; message: string };
