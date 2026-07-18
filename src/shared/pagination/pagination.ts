export interface PaginationParams {
  page: number;
  limit: number;
}

export interface PaginationMeta extends PaginationParams {
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export interface PaginatedResult<T> {
  data: T[];
  pagination: PaginationMeta;
}

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

export function parsePaginationQuery(query: Record<string, unknown>): PaginationParams {
  const page = parsePositiveInteger(query.page, DEFAULT_PAGE);
  const limit = Math.min(parsePositiveInteger(query.limit, DEFAULT_LIMIT), MAX_LIMIT);

  return { page, limit };
}

export function getPaginationArgs(pagination: PaginationParams) {
  return {
    skip: (pagination.page - 1) * pagination.limit,
    take: pagination.limit,
  };
}

export function paginatedResult<T>(data: T[], total: number, pagination: PaginationParams): PaginatedResult<T> {
  const totalPages = Math.max(1, Math.ceil(total / pagination.limit));

  return {
    data,
    pagination: {
      ...pagination,
      total,
      totalPages,
      hasNextPage: pagination.page < totalPages,
      hasPreviousPage: pagination.page > 1,
    },
  };
}

function parsePositiveInteger(value: unknown, fallback: number): number {
  const raw = Array.isArray(value) ? value[0] : value;
  const parsed = Number(raw);

  if (!Number.isInteger(parsed) || parsed < 1) {
    return fallback;
  }

  return parsed;
}
