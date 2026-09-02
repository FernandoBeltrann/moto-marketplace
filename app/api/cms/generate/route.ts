import { NextResponse } from 'next/server';
import { orchestrate } from '@/lib/cms/orchestrator';
import { createDraft, updateDraft } from '@/lib/cms/pages';

export const runtime = 'nodejs';

/** POST /api/cms/generate — chatbot -> orquestador -> doc + guarda borrador (versión 'agent'). */
export async function POST(req: Request) {
  try {
    const body = (await req.json()) as {
      prompt?: string;
      htmlInput?: string;
      pageId?: string;
      currentDoc?: unknown;
      save?: boolean;
    };
    if (!body.prompt && !body.htmlInput) {
      return NextResponse.json({ error: 'Falta prompt o htmlInput.' }, { status: 400 });
    }
    const result = await orchestrate({
      prompt: body.prompt ?? '',
      htmlInput: body.htmlInput ?? null,
      currentDoc: (body.currentDoc as never) ?? null,
      pageId: body.pageId ?? null,
    });
    let page = null;
    if (body.save !== false) {
      page = body.pageId
        ? await updateDraft(body.pageId, result.doc, 'agent', result.reason).catch(() => null)
        : await createDraft(result.doc, 'agent', result.reason).catch(() => null);
    }
    return NextResponse.json({ result, page });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
