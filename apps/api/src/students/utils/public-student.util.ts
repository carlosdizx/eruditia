import UserModel from '@database/models/user.model';
import StudentModel from '@database/models/student.model';

// Cuenta vinculada. Si el usuario se eliminó, el include la deja en null.
export const STUDENT_USER_INCLUDE = [
  { model: UserModel, attributes: ['id', 'email', 'isActive'] },
];

export type PublicStudent = Omit<StudentModel, 'accessPin'> & {
  hasAccessPin: boolean;
};

// El hash del PIN nunca sale de la API: solo si existe.
export const toPublicStudent = (student: StudentModel): PublicStudent => {
  const { accessPin, ...publicStudent } = student;
  return { ...publicStudent, hasAccessPin: !!accessPin } as PublicStudent;
};
