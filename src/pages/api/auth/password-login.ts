import type { APIRoute } from "astro";
import { handlePasswordLogin } from "@/features/auth/auth-flow";

export const POST: APIRoute = async ({ request, cookies }) =>
  handlePasswordLogin(request, cookies);
