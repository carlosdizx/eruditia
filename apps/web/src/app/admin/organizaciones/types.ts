export type Organization = {
  id: string;
  name: string;
  slug: string;
  legalName: string | null;
  taxId: string | null;
  schoolCode: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  website: string | null;
  logoUrl: string | null;
  passingGrade: number;
  isActive: boolean;
  ownerId: string | null;
  createdAt: string;
  deletedAt: string | null;
  owner?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  } | null;
};

// Filtro ?deleted= de GET /organizations (DeletedFilterEnum en la API).
export const DELETED_FILTERS = [
  { value: 'exclude', label: 'Vigentes' },
  { value: 'only', label: 'Eliminadas' },
  { value: 'include', label: 'Todas' },
] as const;

export type DeletedFilter = (typeof DELETED_FILTERS)[number]['value'];

export const parseDeletedFilter = (
  value: string | string[] | undefined,
): DeletedFilter =>
  DELETED_FILTERS.find((filter) => filter.value === value)?.value ?? 'exclude';

// Campos editables de la organización (CreateOrganizationDto / UpdateOrganizationDto).
export const ORGANIZATION_FIELDS = [
  'name',
  'slug',
  'legalName',
  'taxId',
  'schoolCode',
  'email',
  'phone',
  'address',
  'city',
  'state',
  'country',
  'website',
  'logoUrl',
  'passingGrade',
] as const;

export const OWNER_FIELDS = ['firstName', 'lastName', 'email'] as const;

export type OrganizationField = (typeof ORGANIZATION_FIELDS)[number];
export type OwnerField = (typeof OWNER_FIELDS)[number];

export type OrganizationFormValues = Partial<
  Record<OrganizationField | `owner.${OwnerField}` | 'isActive', string>
>;

export type OrganizationFormState =
  | { status: 'idle' }
  | { status: 'error'; message: string; values: OrganizationFormValues };
