import type { APIRoute } from 'astro';
import { getAdminClient } from '@/wix/admin-client';
import { getPublicClient } from '@/wix/public-client';

export const GET: APIRoute = async ({ request }) => {
  const variant = new URL(request.url).searchParams.get('client') === 'public' ? 'public' : 'admin';
  try {
    const client = variant === 'public' ? getPublicClient() : getAdminClient();
    const { reservationLocations } = await client.reservationLocations.listReservationLocations();
    return new Response(JSON.stringify({ ok: true, client: variant, locations: (reservationLocations ?? []).length }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return new Response(JSON.stringify({ ok: false, client: variant, error: message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
