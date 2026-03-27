// Standard API response envelope
export interface ApiResponse<T> {
  status: 'ok' | 'error';
  data: T;
  meta?: PaginationMeta;
  error?: ApiError;
}

export interface PaginationMeta {
  total: number;
  page: number;
  perPage: number;
  totalPages: number;
  [key: string]: any;
}

export interface ApiError {
  code: string;
  message: string;
}
