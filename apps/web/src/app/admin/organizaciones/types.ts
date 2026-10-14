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
  isActive: boolean;
  ownerId: string | null;
  createdAt: string;
  owner?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  } | null;
};

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
