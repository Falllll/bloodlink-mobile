export type ErrorCode =
  | 'VALIDATION_FAILED' | 'UNAUTHENTICATED' | 'FORBIDDEN' | 'NOT_FOUND'
  | 'INTERNAL_ERROR' | 'METHOD_NOT_ALLOWED' | 'TOO_MANY_REQUESTS' | 'HTTP_ERROR'
  | 'IDEMPOTENCY_KEY_REQUIRED' | 'IDEMPOTENCY_KEY_REUSED' | 'REQUEST_IN_PROGRESS'
  | 'DONOR_ACCOUNT_NOT_LINKED';

export type ApiError = {
  error: { code: ErrorCode; message: string; details: Record<string, unknown>; trace_id: string };
};

export type ApiSuccess<T> = { data: T; meta: Record<string, unknown> };

export type ApiPaginated<T> = {
  data: T[];
  links: { next: string | null; prev: string | null };
  meta: {
    per_page: number;
    next_cursor: string | null;
    prev_cursor: string | null;
    has_more: boolean;
  };
};

export type AuthUser = { id: string; name: string; email: string; role: string };

export type AuthToken = { token: string; token_type: 'Bearer'; user: AuthUser };
