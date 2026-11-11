import type { APIRoute } from 'astro';
import { handlePasswordReset } from '@/features/auth/auth-flow';

export const POST: APIRoute = async ({ request }) => handlePasswordReset(request);
