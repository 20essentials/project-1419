export const redirectResponse = (location: string, status = 303) =>
  new Response(null, {
    status,
    headers: { Location: location, 'Cache-Control': 'no-store' },
  });

export const absoluteUrl = (path: string, origin: string) => new URL(path, origin).toString();

export const requestOrigin = (request: Request) => {
  const url = new URL(request.url);
  const forwarded = request.headers.get('x-forwarded-proto');
  const protocol = forwarded ? forwarded.split(',')[0].trim() : url.protocol.replace(':', '');
  return `${protocol}://${url.host}`;
};

export const isSameOrigin = (request: Request) => {
  const origin = request.headers.get('origin');
  if (!origin) return true;
  return origin === requestOrigin(request);
};

export const loginErrorLocation = (origin: string, code: string) =>
  new URL(`/login/?error=${encodeURIComponent(code)}`, origin).toString();
