import type { APIRoute } from 'astro';
import { getAdminClient } from '@/shared/wix/admin-client';
import { getPublicClient } from '@/shared/wix/public-client';

export const GET: APIRoute = async ({ request }) => {
  const variant = new URL(request.url).searchParams.get('client') === 'public' ? 'public' : 'admin';
  try {
    if (variant === 'public') {
      const client = getPublicClient();
      try {
        await client.reservationLocations.listReservationLocations();
        return new Response(JSON.stringify({ ok: true, client: variant, tableReservations: true }), {
          headers: { 'Content-Type': 'application/json' },
        });
      } catch (error) {
        return new Response(JSON.stringify({ ok: true, client: variant, tableReservations: false, detail: String(error).slice(0, 300) }), {
          headers: { 'Content-Type': 'application/json' },
        });
      }
    }
    const client = getAdminClient();
    const { locations: sites } = await client.locations.listLocations();
    let tableReservations: true | { detail: string } = true;
    try {
      await client.reservationLocations.listReservationLocations();
    } catch (error) {
      tableReservations = { detail: String(error instanceof Error && error.message || error).slice(0, 300) };
    }
    return new Response(
      JSON.stringify({ ok: true, client: variant, businessLocations: (sites ?? []).length, tableReservations }),
      { headers: { 'Content-Type': 'application/json' } },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return new Response(JSON.stringify({ ok: false, client: variant, error: message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
