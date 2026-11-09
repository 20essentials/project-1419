import { env } from 'cloudflare:workers';

interface WixConfig {
  clientId: string;
  apiKey: string;
  siteId: string;
}

export const getWixConfig = (): WixConfig => {
  const runtime = env as Record<string, string | undefined>;
  const clientId = runtime.WIX_CLIENT_ID;
  const apiKey = runtime.WIX_API_KEY;
  const siteId = runtime.WIX_SITE_ID;
  const missing = Object.entries({ WIX_CLIENT_ID: clientId, WIX_API_KEY: apiKey, WIX_SITE_ID: siteId })
    .filter(([, value]) => typeof value !== 'string' || value.length === 0)
    .map(([key]) => key);
  if (missing.length > 0) {
    throw new Error(`faltan variables de Wix en el runtime: ${missing.join(', ')}`);
  }
  return { clientId: clientId as string, apiKey: apiKey as string, siteId: siteId as string };
};
