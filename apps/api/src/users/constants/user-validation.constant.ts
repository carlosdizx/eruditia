// Cédula, pasaporte o similar: solo letras, números y guiones.
export const DOCUMENT_NUMBER_PATTERN = /^[A-Za-z0-9-]{3,30}$/;
export const PHONE_PATTERN = /^\+?[0-9 ]{7,20}$/;

export const INVALID_DOCUMENT_NUMBER_MESSAGE =
  'El documento solo admite letras, números y guiones (3 a 30 caracteres)';
export const INVALID_PHONE_MESSAGE =
  'El teléfono solo admite números, espacios y un + inicial (7 a 20 caracteres)';
