import type { APIRoute } from 'astro';
import { invalidateMenuCache } from '@/features/menu/menu-data';

export const GET: APIRoute = async () => {
  invalidateMenuCache();
  return new Response(JSON.stringify({ ok: true, cache: 'cleared' }), {
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  });
};
