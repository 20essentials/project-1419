import type { APIRoute } from 'astro';
import { getMemberClient } from '@/shared/wix/member-client';
import { getMemberSession, requestIsSecure } from '@/shared/auth/session';

export const GET: APIRoute = async ({ request, cookies }) => {
  const headers = { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' };
  const tokens = await getMemberSession(cookies, requestIsSecure(request));
  if (!tokens) {
    return new Response(JSON.stringify({ loggedIn: false }), { headers });
  }
  try {
    const client = getMemberClient(tokens);
    const { member } = await client.members.getCurrentMember({ fieldsets: ['FULL'] });
    return new Response(
      JSON.stringify({
        loggedIn: true,
        member: {
          id: member?._id,
          email: member?.loginEmail,
          nickname: member?.profile?.nickname,
          firstName: member?.contact?.firstName,
          lastName: member?.contact?.lastName,
        },
      }),
      { headers },
    );
  } catch {
    return new Response(JSON.stringify({ loggedIn: true, member: null }), { headers });
  }
};
