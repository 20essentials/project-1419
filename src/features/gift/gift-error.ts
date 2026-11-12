import type { APIRoute } from 'astro';

export type GiftErrorCode =
  | 'INVALID_INPUT'
  | 'PRODUCT_UNAVAILABLE'
  | 'CHECKOUT_UNAVAILABLE'
  | 'PREMIUM_ONLY';

export class GiftError extends Error {
  constructor(
    public readonly code: GiftErrorCode,
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = 'GiftError';
  }
}

export const GIFT_ERROR_STATUS: Record<GiftErrorCode, number> = {
  INVALID_INPUT: 400,
  PRODUCT_UNAVAILABLE: 502,
  CHECKOUT_UNAVAILABLE: 502,
  PREMIUM_ONLY: 428,
};

export function jsonError(code: GiftErrorCode | string, status: number, detail?: string): Response {
  return new Response(JSON.stringify({ error: code, ...(detail ? { detail } : {}) }), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

export function jsonOk(data: Record<string, unknown>, status = 200, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...headers },
  });
}

export function isGiftError(error: unknown): error is GiftError {
  return error instanceof GiftError;
}
