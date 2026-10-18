import UserModel from '@database/models/user.model';

// Cuenta vinculada. Si el usuario se eliminó, el include la deja en null.
export const STUDENT_USER_INCLUDE = [
  { model: UserModel, attributes: ['id', 'email', 'isActive'] },
];
