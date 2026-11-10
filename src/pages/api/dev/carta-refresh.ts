import type { APIRoute } from 'astro';
import { invalidateCartaCache } from '@/features/menu/carta-data';

export const GET: APIRoute = async () => {
  invalidateCartaCache();
  return new Response(JSON.stringify({ ok: true, cache: 'cleared' }), {
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  });
};
