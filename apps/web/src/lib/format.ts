const dateTimeFormat = new Intl.DateTimeFormat('es', {
  dateStyle: 'medium',
  timeStyle: 'short',
});

const dateFormat = new Intl.DateTimeFormat('es', { dateStyle: 'medium' });

export const formatDateTime = (value: string | null) =>
  value ? dateTimeFormat.format(new Date(value)) : '—';

export const formatDate = (value: string | null) =>
  value ? dateFormat.format(new Date(value)) : '—';

export const initialsOf = (user: { firstName: string; lastName: string }) =>
  `${user.firstName.charAt(0)}${user.lastName.charAt(0)}`.toUpperCase();
