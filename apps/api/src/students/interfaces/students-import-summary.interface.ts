export interface StudentsImportRowError {
  // Línea del archivo (la 1 es el encabezado).
  line: number;
  documentNumber: string | null;
  messages: string[];
}

export interface StudentsImportSummary {
  total: number;
  created: number;
  failed: number;
  errors: StudentsImportRowError[];
}
