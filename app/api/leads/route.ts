import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import fs from 'node:fs/promises';
import path from 'node:path';
import { getPostHogClient, shutdownPostHog } from '@/lib/posthog-server';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const lead = {
      ...body,
      source: 'motoclick_marketplace_mvp',
      lead_destination: 'finva_crm',
      created_at: new Date().toISOString(),
      user_agent: req.headers.get('user-agent') || null,
      ip: req.headers.get('x-forwarded-for') || null
    };

    const crmWebhookUrl = process.env.FINVA_CRM_WEBHOOK_URL;
    if (crmWebhookUrl) {
      const crmRes = await fetch(crmWebhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(lead)
      });
      if (!crmRes.ok) throw new Error(`Finva CRM webhook failed: ${crmRes.status}`);
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const table = process.env.SUPABASE_LEADS_TABLE || 'marketplace_leads';

    if (supabaseUrl && serviceRole) {
      const supabase = createClient(supabaseUrl, serviceRole);
      const { error } = await supabase.from(table).insert(lead);
      if (error) throw error;
    } else if (process.env.NODE_ENV !== 'production') {
      const file = path.join(process.cwd(), 'leads.local.json');
      await fs.appendFile(file, `${JSON.stringify(lead)}
`);
    } else {
      console.log('Lead received without Supabase configured:', lead);
    }

    const posthog = getPostHogClient();
    if (posthog) {
      const distinctId = req.headers.get('x-posthog-distinct-id') || body.phone || 'anonymous';
      const sessionId = req.headers.get('x-posthog-session-id') || undefined;
      posthog.capture({
        distinctId,
        event: 'lead_submitted_server',
        properties: {
          motorcycleId: body.motorcycleId,
          motorcycleName: body.motorcycleName,
          city: body.city,
          purchaseTiming: body.purchaseTiming,
          path: body.path,
          utm: body.utm,
          source: 'motoclick_marketplace_mvp',
          ...(sessionId ? { $session_id: sessionId } : {}),
        },
      });
      await shutdownPostHog();
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ ok: false, error: 'Could not save lead' }, { status: 500 });
  }
}
