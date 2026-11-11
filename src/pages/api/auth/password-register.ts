import type { APIRoute } from 'astro';
import { handlePasswordRegister } from '@/features/auth/auth-flow';

export const POST: APIRoute = async ({ request, cookies }) => handlePasswordRegister(request, cookies);
