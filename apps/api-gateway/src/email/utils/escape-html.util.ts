const HTML_ENTITIES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
};

// Todo valor dinámico (nombres, correos, etc.) que se interpole en una
// plantilla debe pasar por aquí para no inyectar HTML en el correo.
const escapeHtml = (value: string): string => {
  return value.replace(/[&<>"']/g, (char) => HTML_ENTITIES[char]);
};

export default escapeHtml;
