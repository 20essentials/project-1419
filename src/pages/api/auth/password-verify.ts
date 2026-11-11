import type { APIRoute } from 'astro';
import { handlePasswordVerify } from '@/features/auth/auth-flow';

export const POST: APIRoute = async ({ request, cookies }) => handlePasswordVerify(request, cookies);
