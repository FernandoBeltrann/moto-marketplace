import { posthogProjectToken } from '@/lib/posthog-env';

export const dynamic = 'force-dynamic';

/** Expone el token al cliente cuando solo existe en runtime (p. ej. Railway). */
export function GET() {
  const token = posthogProjectToken();
  if (!token) {
    return Response.json({ token: null }, { status: 404 });
  }

  return Response.json(
    { token },
    {
      headers: {
        'Cache-Control': 'no-store, max-age=0',
      },
    }
  );
}
