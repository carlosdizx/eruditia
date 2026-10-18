// Respuesta de los listados paginados de la API.
export type Paginated<T> = {
  data: T[];
  meta: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
    nextPage: number | null;
    prevPage: number | null;
    from: number;
    to: number;
  };
};

export const DEFAULT_PAGE_SIZE = 10;

// Normaliza ?page= de la URL a un entero >= 1.
export const parsePage = (value: string | string[] | undefined) => {
  const page = Number(Array.isArray(value) ? value[0] : value);
  return Number.isInteger(page) && page > 0 ? page : 1;
};
