import type { AstroCookies } from 'astro';
import type { OauthData, Tokens } from '@wix/sdk';
import { getMemberClient } from '@/shared/wix/member-client';

export const SESSION_COOKIE = 'wix-session';
export const OAUTH_COOKIE = 'wix-oauth';

const SESSION_MAX_AGE = 60 * 60 * 24 * 30;
const OAUTH_MAX_AGE = 60 * 10;
const RENEW_MARGIN_SECONDS = 60;

const toBase64Url = (bytes: Uint8Array) => {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
};

const fromBase64Url = (value: string) => {
  const base64 = value.replace(/-/g, '+').replace(/_/g, '/');
  const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4);
  const binary = atob(padded);
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
};

const encode = (value: unknown) => toBase64Url(new TextEncoder().encode(JSON.stringify(value)));

const decode = <T>(raw: string | undefined): T | null => {
  if (!raw) return null;
  try {
    return JSON.parse(new TextDecoder().decode(fromBase64Url(raw))) as T;
  } catch {
    return null;
  }
};

export const requestIsSecure = (request: Request) => {
  const forwarded = request.headers.get('x-forwarded-proto');
  if (forwarded) return forwarded.split(',')[0].trim() === 'https';
  return new URL(request.url).protocol === 'https:';
};

export const isMemberTokens = (value: unknown): value is Tokens => {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<Tokens>;
  const access = candidate.accessToken;
  const refresh = candidate.refreshToken;
  return Boolean(
    access &&
      typeof access.value === 'string' &&
      access.value.length > 0 &&
      typeof access.expiresAt === 'number' &&
      Number.isFinite(access.expiresAt) &&
      access.expiresAt > 0 &&
      refresh &&
      typeof refresh.value === 'string' &&
      refresh.value.length > 0 &&
      refresh.role === 'member',
  );
};

const isOauthData = (value: unknown): value is OauthData => {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<OauthData>;
  return (
    typeof candidate.state === 'string' &&
    candidate.state.length > 0 &&
    typeof candidate.codeVerifier === 'string' &&
    candidate.codeVerifier.length > 0 &&
    typeof candidate.codeChallenge === 'string' &&
    candidate.codeChallenge.length > 0 &&
    typeof candidate.redirectUri === 'string' &&
    candidate.redirectUri.length > 0 &&
    typeof candidate.originalUri === 'string'
  );
};

export const isAccessTokenExpired = (tokens: Tokens, marginSeconds = RENEW_MARGIN_SECONDS) =>
  tokens.accessToken.expiresAt <= Math.floor(Date.now() / 1000) + marginSeconds;

export const readSessionTokens = (cookies: AstroCookies): Tokens | null => {
  const tokens = decode<Tokens>(cookies.get(SESSION_COOKIE)?.value);
  return isMemberTokens(tokens) ? tokens : null;
};

export const writeSessionTokens = (cookies: AstroCookies, tokens: Tokens, secure: boolean) => {
  cookies.set(SESSION_COOKIE, encode(tokens), {
    path: '/',
    httpOnly: true,
    secure,
    sameSite: 'lax',
    maxAge: SESSION_MAX_AGE,
  });
};

export const clearSessionTokens = (cookies: AstroCookies) => {
  cookies.delete(SESSION_COOKIE, { path: '/' });
};

export const readOAuthData = (cookies: AstroCookies): OauthData | null => {
  const data = decode<OauthData>(cookies.get(OAUTH_COOKIE)?.value);
  return isOauthData(data) ? data : null;
};

export const writeOAuthData = (cookies: AstroCookies, data: OauthData, secure: boolean) => {
  cookies.set(OAUTH_COOKIE, encode(data), {
    path: '/',
    httpOnly: true,
    secure,
    sameSite: 'lax',
    maxAge: OAUTH_MAX_AGE,
  });
};

export const clearOAuthData = (cookies: AstroCookies) => {
  cookies.delete(OAUTH_COOKIE, { path: '/' });
};

export const getMemberSession = async (cookies: AstroCookies, secure: boolean): Promise<Tokens | null> => {
  const tokens = readSessionTokens(cookies);
  if (!tokens) {
    if (cookies.has(SESSION_COOKIE)) clearSessionTokens(cookies);
    return null;
  }
  if (!isAccessTokenExpired(tokens)) return tokens;
  try {
    const renewed = await getMemberClient().auth.renewToken(tokens.refreshToken);
    if (!isMemberTokens(renewed)) throw new Error('member tokens expected');
    writeSessionTokens(cookies, renewed, secure);
    return renewed;
  } catch {
    clearSessionTokens(cookies);
    return null;
  }
};

export const safeReturnTo = (value: string | null | undefined, fallback = '/account/') => {
  if (!value) return fallback;
  if (!value.startsWith('/') || value.startsWith('//')) return fallback;
  if (value.includes('\\') || /[\r\n]/.test(value)) return fallback;
  return value;
};
