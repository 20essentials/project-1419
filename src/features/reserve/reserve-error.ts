import type { APIRoute } from 'astro';

export type ReserveErrorCode =
  | 'INVALID_INPUT'
  | 'EXPERIENCE_NOT_FOUND'
  | 'NO_AVAILABILITY'
  | 'PREMIUM_ONLY'
  | 'RESERVATION_UNAVAILABLE';

export class ReserveError extends Error {
  constructor(
    public readonly code: ReserveErrorCode,
    public readonly status: number,
    message: string,
    public readonly field?: string,
  ) {
    super(message);
    this.name = 'ReserveError';
  }
}

export const RESERVE_ERROR_STATUS: Record<ReserveErrorCode, number> = {
  INVALID_INPUT: 400,
  EXPERIENCE_NOT_FOUND: 404,
  NO_AVAILABILITY: 409,
  PREMIUM_ONLY: 428,
  RESERVATION_UNAVAILABLE: 502,
};

export function jsonError(code: ReserveErrorCode | string, status: number, detail?: string, field?: string): Response {
  return new Response(
    JSON.stringify({ error: code, ...(field ? { field } : {}), ...(detail ? { detail } : {}) }),
    {
      status,
      headers: { 'Content-Type': 'application/json' },
    },
  );
}

export function jsonOk(data: Record<string, unknown>, status = 200, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...headers },
  });
}

export function isReserveError(error: unknown): error is ReserveError {
  return error instanceof ReserveError;
}
