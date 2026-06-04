/**
 * 📄 Pagination Utilities
 * Cursor-based and offset-based pagination helpers
 */

// Type definitions
interface PaginatedResponse<T> {
  data: T[];
  meta: {
    currentPage: number;
    perPage: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
}

interface CursorPaginationParams<T> {
  items: T[];
  hasMore: boolean;
  nextCursor: string | null;
  total: number;
}

interface OffsetPaginationParams {
  page?: number;
  limit?: number;
}

/**
 * Create cursor for cursor-based pagination
 */
export function createCursor<T>(item: T, fields: (keyof T)[]): string {
  const cursorValues = fields.map((field) => String(item[field]));
  return btoa(cursorValues.join(":"));
}

/**
 * Decode cursor
 */
export function decodeCursor(cursor: string): string[] {
  try {
    return atob(cursor).split(":");
  } catch {
    return [];
  }
}

/**
 * Build cursor-based query params
 */
export function buildCursorParams<T>(
  items: T[],
  cursorField: keyof T,
  limit: number,
): CursorPaginationParams<T> {
  if (items.length === 0) {
    return { items: [], hasMore: false, nextCursor: null, total: 0 };
  }

  const hasMore = items.length > limit;
  const resultItems = hasMore ? items.slice(0, limit) : items;
  const lastItem = resultItems[resultItems.length - 1] as T;

  return {
    items: resultItems,
    hasMore,
    nextCursor: hasMore
      ? createCursor(lastItem, [cursorField] as unknown as (keyof T)[])
      : null,
    total: items.length,
  };
}

/**
 * Parse offset-based pagination params from request
 */
export function parseOffsetParams(params: OffsetPaginationParams): {
  page: number;
  limit: number;
  offset: number;
} {
  const page = Math.max(1, params.page || 1);
  const limit = Math.min(100, Math.max(1, params.limit || 20));
  const offset = (page - 1) * limit;

  return { page, limit, offset };
}

/**
 * Calculate pagination metadata
 */
export function getPaginationMeta(
  page: number,
  limit: number,
  total: number,
  totalPages: number,
): PaginatedResponse<unknown>["meta"] {
  return {
    currentPage: page,
    perPage: limit,
    total,
    totalPages,
    hasNextPage: page < totalPages,
    hasPrevPage: page > 1,
  };
}

/**
 * Create paginated response structure
 */
export function createPaginatedResponse<T>(
  items: T[],
  page: number,
  limit: number,
  total: number,
): PaginatedResponse<T> {
  const totalPages = Math.ceil(total / limit);

  return {
    data: items,
    meta: getPaginationMeta(page, limit, total, totalPages),
  };
}

/**
 * Debounce utility for search inputs
 */
export function debounce<T extends (...args: Parameters<T>) => ReturnType<T>>(
  func: T,
  wait: number,
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;

  return (...args: Parameters<T>) => {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

/**
 * Throttle utility for scroll events
 */
export function throttle<T extends (...args: Parameters<T>) => ReturnType<T>>(
  func: T,
  limit: number,
): (...args: Parameters<T>) => void {
  let inThrottle = false;

  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
}
