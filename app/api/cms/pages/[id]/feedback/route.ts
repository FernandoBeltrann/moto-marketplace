import { NextResponse } from 'next/server';
import { addFeedback } from '@/lib/cms/pages';

export const runtime = 'nodejs';

/** POST /api/cms/pages/:id/feedback { score, comment } — alimenta el aprendizaje del orquestador. */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = (await req.json()) as { score?: number; comment?: string };
    if (typeof body.score !== 'number') return NextResponse.json({ error: 'Falta score.' }, { status: 400 });
    await addFeedback(id === 'global' ? null : id, body.score, body.comment ?? null);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
