// Fila de GET /users.
export type OrganizationUser = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  isActive: boolean;
  role: { id: string; name: string; labelEs: string } | null;
};

// GET /roles: solo roles asignables dentro de una organización.
export type AssignableRole = {
  id: string;
  name: string;
  label: string;
  labelEs: string;
};

export type UserFormValues = Partial<
  Record<'firstName' | 'lastName' | 'email' | 'roleId' | 'isActive', string>
>;

export type UserFormState =
  | { status: 'idle' }
  | { status: 'success'; message: string }
  | { status: 'error'; message: string; values: UserFormValues };

export type UserActionResult = { ok: true } | { ok: false; message: string };
